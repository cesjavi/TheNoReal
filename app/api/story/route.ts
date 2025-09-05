import { NextResponse } from "next/server";
import createChatCompletion from "@/lib/groqClient";
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
import { authOptions } from "../auth/[...nextauth]/route";

// ---------- Tipos auxiliares ----------
type Ajustes = {
  temperature?: number;
  top_p?: number;
  targetWords?: number;
  evitar?: string[];
};

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

// Minimal, sólo lo que usamos
type ChatMessage = { role: "system" | "user"; content: string };

type ChatChoice = {
  index?: number;
  message?: { role?: string; content?: string };
  finish_reason?: string | null;
};

type ChatCompletion = {
  id?: string;
  model?: string;
  choices: ChatChoice[];
};

function isObject(x: unknown): x is Record<string, unknown> {
  return typeof x === "object" && x !== null;
}

function isStringArray(x: unknown): x is string[] {
  return Array.isArray(x) && x.every((v) => typeof v === "string");
}

function isStoryRequest(x: unknown): x is StoryRequest {
  if (!isObject(x)) return false;
  // `story` puede ser cadena vacía; lo único “obligatorio” para nosotros
  // es que exista el objeto y que no tenga tipos imposibles.
  if ("genres" in x && !isStringArray((x as StoryRequest).genres)) return false;
  return true;
}

// ---------- Handler ----------
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!process.env.GROQ_API_KEY) {
    return NextResponse.json({ error: "GROQ_API_KEY no configurada" }, { status: 400 });
  }

  try {
    const raw = (await req.json()) as unknown;
    if (!isStoryRequest(raw)) {
      return NextResponse.json({ error: "Bad request" }, { status: 400 });
    }

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

    // Sampling y targets
    const optionsCount: number = Number(optionsPerDecision) || 2;
    const temperature = limitTemperature(ajustes?.temperature) ?? 0.75;
    const top_p = limitTopP(ajustes?.top_p) ?? 0.9;
    const targetWords: number =
      typeof ajustes?.targetWords === "number" ? ajustes.targetWords : 220;

    // META base
    const { evitar = [], ...ajustesRest } = ajustes || {};
    const bannedKeywords = Array.isArray(evitar)
      ? evitar.filter((s): s is string => typeof s === "string" && s.trim().length > 0)
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

    // Extensión de META en el mismo bloque
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

    // Mensaje de usuario (con [META])
    const userContent = buildUserMessage({
      text: [storyText, finalize ? "\nFinaliza ahora." : ""].join(""),
      chosenOption,
      optionsCount,
      targetWords,
      metaBlock,
    });

    const messages: ChatMessage[] = [
      { role: "system", content: SYSTEM_PROMPT_V3 },
      { role: "user", content: userContent },
    ];

    const model =
      process.env.GROQ_MODEL || "moonshotai/kimi-k2-instruct"; // fallback

    const maxRetries = 2;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      const completion = (await createChatCompletion({
        model,
        messages, // ← ya no es `any`
        temperature,
        top_p,
      })) as ChatCompletion;

      // Debug (servidor). Si no querés logs, remové esta línea.
      // eslint-disable-next-line no-console
      console.dir(completion.choices, { depth: null });

      const text: string = completion?.choices?.[0]?.message?.content ?? "";
      if (!text) {
        return NextResponse.json(
          { error: "Respuesta vacía del modelo" },
          { status: 502 }
        );
      }

      // Parseo formato (capítulo + --- + opciones)
      const { story, options, isFinal } = parseStoryResponse(text, optionsCount);

      if (!isFinal && story) {
        const fp = computeFingerprint({ chapterText: story, genres });
        const similar = isFingerprintTooSimilar(
          fp,
          getRecentFingerprints()
        );
        if (similar) {
          if (attempt < maxRetries) {
            continue; // reintentar
          }
          return NextResponse.json(
            { error: "Historia muy similar" },
            { status: 409 }
          );
        }
        pushFingerprint(fp);
      }

      return NextResponse.json({ story, options, isFinal, raw: text });
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    // eslint-disable-next-line no-console
    console.error("api/story error:", msg);
    return NextResponse.json(
      { error: "Error al procesar la solicitud" },
      { status: 500 }
    );
  }
}
