// app/api/story/route.ts
import { NextResponse } from "next/server";
import Groq from "groq-sdk";
import { SYSTEM_PROMPT_V3, buildUserMessage } from "@/lib/storyPrompt";
import { buildMeta } from "@/lib/meta";
import {
  computeFingerprint,
  pushFingerprint,
  getRecentFingerprints,
  isFingerprintTooSimilar,
} from "@/lib/fingerprint";
import { parseStoryResponse } from "@/lib/parseStoryResponse";
import { limitTemperature, limitTopP } from "@/lib/sampling";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";


export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ---- Groq client
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY ?? "" });

// ---- Tipos
type ChatMsg = { role: "system" | "user" | "assistant"; content: string };
type Ajustes = { temperature?: number; top_p?: number; targetWords?: number; evitar?: string[] };
type StoryRequest = {
  story?: string;
  option?: string;
  optionsPerDecision?: number;
  genres?: string[];
  estilo?: Record<string, unknown>;
  ajustes?: Ajustes;
  language?: string;
  endingMode?: string;
  chaptersCount?: number;
  finalize?: boolean;
};

// ---- helpers
function isObject(x: unknown): x is Record<string, unknown> {
  return typeof x === "object" && x !== null;
}
function isStringArray(x: unknown): x is string[] {
  return Array.isArray(x) && x.every((v) => typeof v === "string");
}
function isStoryRequest(x: unknown): x is StoryRequest {
  return isObject(x) && (!("genres" in x) || isStringArray((x as any).genres));
}
async function withTimeout<T>(p: Promise<T>, ms = 30000): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, rej) => setTimeout(() => rej(new Error("timeout")), ms)),
  ]);
}

// Intentamos en este orden
const MODEL_PRIORITY = [process.env.GROQ_MODEL || "moonshotai/kimi-k2-instruct", "gpt-oss-20b"];

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  /* if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); */

  if (!process.env.GROQ_API_KEY) {
    return NextResponse.json({ error: "GROQ_API_KEY no configurada" }, { status: 400 });  
  }

  try {
    const raw = (await req.json()) as unknown;
    if (!isStoryRequest(raw)) return NextResponse.json({ error: "Bad request" }, { status: 400 });

    const {
      story: storyText = "",
      option: chosenOption = "",
      optionsPerDecision = 2,
      genres = [],
      estilo = {},
      ajustes = {} as Ajustes,
      language = "es",
      endingMode,
      chaptersCount,
      finalize = false,
    } = raw;

    // 👇 Solo pedimos "option" a partir del segundo turno.
    // Heurística: si el texto ya incluye líneas de elección con ">\s"
    const isFirstTurn = !/\n>\s*/.test(storyText);
    if (!finalize && !isFirstTurn && !chosenOption?.trim()) {
      return NextResponse.json({ error: "Missing option" }, { status: 400 });
    }

    const baseTemp = limitTemperature(ajustes?.temperature) ?? 0.75;
    const baseTopP = limitTopP(ajustes?.top_p) ?? 0.9;
    const optionsCount = Number(optionsPerDecision) || 2;
    const targetWords =
      typeof ajustes?.targetWords === "number" ? ajustes.targetWords : 220;

    // META y filtros
    const { evitar = [], ...ajustesRest } = ajustes || {};
    const bannedKeywords: string[] = Array.isArray(evitar)
      ? evitar.map(String).map((s) => s.trim()).filter((s) => s.length > 0)
      : [];

    const metaBase = buildMeta({
      optionsCount,
      targetWords,
      recentFingerprints: getRecentFingerprints(),
      bannedCliches: [
        "todo fue un sueño",
        "llamadas sin identificador",
        "hospital psiquiátrico abandonado",
      ],
      bannedKeywords,
    });

    const metaConfigLines = [
      `language=${language}`,
      `genres=[${genres.map((g) => JSON.stringify(g)).join(", ")}]`,
      endingMode ? `ending_mode=${endingMode}` : null,
      Number.isFinite(chaptersCount) ? `chapters_count=${chaptersCount}` : null,
      `estilo=${JSON.stringify(estilo)}`,
      `ajustes=${JSON.stringify(ajustesRest)}`,
      finalize ? `finalize_now=true` : null,
    ].filter(Boolean) as string[];

    const metaBlock = [metaBase.trim(), ...metaConfigLines].join("\n");

    const userContentBase = buildUserMessage({
      text: [storyText, finalize ? "\nFinaliza ahora." : ""].join(""),
      chosenOption, // puede ir vacío en el primer turno
      optionsCount,
      targetWords,
      metaBlock,
    });

    const maxRetriesPerModel = 3;

    for (const model of MODEL_PRIORITY) {
      for (let attempt = 0; attempt <= maxRetriesPerModel; attempt++) {
        const temperature = Math.min(baseTemp + attempt * 0.15, 1.3);
        const top_p = Math.min(baseTopP + attempt * 0.05, 1.0);

        const antiRepetition =
          attempt > 0
            ? `

[ANTI_REPETITION]
Evita repetir tramas o giros usados antes. Sé más específico, original y ligado a ${JSON.stringify(
                genres
              )}.`
            : "";

        const messages: ChatMsg[] = [
          { role: "system", content: SYSTEM_PROMPT_V3 },
          { role: "user", content: userContentBase + antiRepetition },
        ];

        try {
          const completion: any = await withTimeout(
            groq.chat.completions.create({
              model,
              messages,
              temperature,
              top_p,
            }),
            30000
          );

          const text: string = completion?.choices?.[0]?.message?.content ?? "";
          if (!text) {
            if (attempt < maxRetriesPerModel) continue;
            break; // siguiente modelo
          }

          const { story, options, isFinal } = parseStoryResponse(text, optionsCount);

          if (!isFinal && !finalize && story) {
            const fp = computeFingerprint({ chapterText: story, genres });
            const similar = isFingerprintTooSimilar(fp, getRecentFingerprints());
            if (similar) {
              if (attempt < maxRetriesPerModel) continue;
              pushFingerprint(fp);
              return NextResponse.json({ story, options, isFinal, similar: true });
            }
            pushFingerprint(fp);
          }

          return NextResponse.json({ story, options, isFinal });
        } catch (err: any) {
          console.error(`Error con modelo ${model} (intento ${attempt}):`, err?.message ?? err);
          if (attempt >= maxRetriesPerModel) break; // probamos otro modelo
        }
      }
    }

    return NextResponse.json({ error: "Todos los modelos fallaron" }, { status: 502 });
  } catch (err: any) {
    console.error("api/story error:", err?.message ?? err);
    return NextResponse.json(
      { error: "Error al procesar la solicitud", detail: err?.message ?? String(err) },
      { status: 500 }
    );
  }
}
