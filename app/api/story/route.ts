import { NextResponse } from "next/server";
import createChatCompletion from "@/lib/groqClient";
import { SYSTEM_PROMPT_V3, buildUserMessage } from "@/lib/storyPrompt";
import { buildMeta } from "@/lib/meta";
import { computeFingerprint, pushFingerprint, getRecentFingerprints } from "@/lib/fingerprint";
import { parseStoryResponse } from "@/lib/parseStoryResponse";
import { limitTemperature, limitTopP } from "@/lib/sampling";

export async function POST(req: Request) {
  if (!process.env.GROQ_API_KEY) {
    return NextResponse.json({ error: "GROQ_API_KEY no configurada" }, { status: 400 });
  }

  try {
    const body = await req.json();
    const {
      story: storyText = "",
      option: chosenOption = "",
      optionsPerDecision = 2,
      genres = [],
      estilo = {},
      ajustes = {} as { temperature?: number; top_p?: number; targetWords?: number },
      language = "es",
      endingMode,
      chaptersCount,
      finalize = false,
    } = body;

    // Sampling y targets
    const optionsCount: number = Number(optionsPerDecision) || 2;
    const temperature = limitTemperature(ajustes?.temperature) ?? 0.75;
    const top_p = limitTopP(ajustes?.top_p) ?? 0.9;
    const targetWords: number = typeof ajustes?.targetWords === "number" ? ajustes.targetWords : 220;

    // META base (tu helper)
    const metaBase = buildMeta({
      optionsCount,
      targetWords,
      recentFingerprints: getRecentFingerprints(),
      bannedCliches: ["todo fue un sueño", "llamadas sin identificador", "hospital psiquiátrico abandonado"],
    });

    // EXTENSIÓN: inyecto toda la config dentro del MISMO [META]
    // (no agrego [CONFIG] extra, para no tocar storyPrompt.ts)
    const metaConfigLines = [
  `language=${language}`,
  `genres=[${(genres as string[]).map((g: string) => JSON.stringify(g)).join(", ")}]`,
  endingMode ? `ending_mode=${endingMode}` : null,
  Number.isFinite(chaptersCount) ? `chapters_count=${chaptersCount}` : null,
  `estilo=${JSON.stringify(estilo)}`,
  `ajustes=${JSON.stringify(ajustes)}`,
  finalize ? `finalize_now=true` : null,
].filter(Boolean) as string[];


    const metaBlock = [metaBase.trim(), ...metaConfigLines].join("\n");

    // Construyo el mensaje de usuario CON el [META] (buildUserMessage ya lo envuelve)
    const userContent = buildUserMessage({
      text: [
        storyText,
        finalize ? "\nFinaliza ahora." : "",
      ].join(""),
      chosenOption,
      optionsCount,
      targetWords,
      metaBlock,
    });

    const messages = [
      { role: "system", content: SYSTEM_PROMPT_V3 },
      { role: "user", content: userContent },
    ] as const;

    const model = process.env.GROQ_MODEL || "moonshotai/kimi-k2-instruct";//"openai/gpt-oss-120b";// "meta-llama/llama-4-scout-17b-16e-instruct";
    const completion = await createChatCompletion({
      model,
      messages: messages as any,
      temperature,
      top_p,
    });
  // 👇 Log completo para debug
  console.dir(completion.choices, { depth: null });

    const text: string = completion?.choices?.[0]?.message?.content ?? "";
    if (!text) {
      return NextResponse.json({ error: "Respuesta vacía del modelo" }, { status: 502 });
    }

    // Parseo según tu formato (capítulo + --- + opciones)
    const { story, options, isFinal } = parseStoryResponse(text, optionsCount);

    // Huellas para antirrep (solo si no es final y hay capítulo)
    if (!isFinal && story) {
      const fp = computeFingerprint({ chapterText: story, genres });
      pushFingerprint(fp);
    }

    // Devuelvo lo que espera el frontend
    return NextResponse.json({ story, options, isFinal, raw: text });
  } catch (err) {
    console.error("api/story error:", err);
    return NextResponse.json({ error: "Error al procesar la solicitud" }, { status: 500 });
  }
}
