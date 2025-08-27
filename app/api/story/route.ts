import { NextResponse } from "next/server";
import createChatCompletion from "@/lib/groqClient";
import { SYSTEM_PROMPT_V3 } from "@/lib/storyPrompt";
import { buildMeta } from "@/lib/meta";
import { computeFingerprint, pushFingerprint, getRecentFingerprints } from "@/lib/fingerprint";
import { parseStoryResponse } from "@/lib/parseStoryResponse";
import type { ChatCompletionMessageParam } from "groq-sdk/resources/chat/completions";
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
      ajustes = {},
      language = "es",
      endingMode,
      chaptersCount,
      finalize = false,
    } = body;

    const optionsCount: number = Number(optionsPerDecision) || 2;
    const temperature: number = typeof ajustes?.temperature === "number" ? ajustes.temperature : 0.75;
    const top_p: number = typeof ajustes?.top_p === "number" ? ajustes.top_p : 0.9;
    const targetWords: number = typeof ajustes?.targetWords === "number" ? ajustes.targetWords : 220;

    // Construimos bloque CONFIG con todo lo que llega del cliente
    const configBlock = [
      "[CONFIG]",
      `language=${language}`,
      `genres=${genres.join(", ") || "sin-especificar"}`,
      endingMode ? `ending_mode=${endingMode}` : null,
      chaptersCount ? `chapters_count=${chaptersCount}` : null,
      `estilo=${JSON.stringify(estilo)}`,
      `ajustes=${JSON.stringify(ajustes)}`,
      "[/CONFIG]",
    ].filter(Boolean).join("\n");

    const metaBlock = buildMeta({
      optionsCount,
      targetWords,
      recentFingerprints: getRecentFingerprints(),
      bannedCliches: ["todo fue un sueño", "llamadas sin identificador", "hospital psiquiátrico abandonado"],
    });

    const userContent = [
      storyText,
      chosenOption ? `\nOpción elegida: ${chosenOption}` : "",
      finalize ? "\nFinaliza ahora." : "",
      "\n",
      configBlock,
      "\n",
      metaBlock,
    ].join("");

    

    const messages: ChatCompletionMessageParam[] = [
      { role: "system", content: SYSTEM_PROMPT_V3 },
      { role: "user", content: userContent },
    ];

    const model = process.env.GROQ_MODEL || "meta-llama/llama-4-scout-17b-16e-instruct";
    const completion = await createChatCompletion({
      model,
      messages,
      temperature,
      top_p,
    });

    const text: string = completion?.choices?.[0]?.message?.content ?? "";
    if (!text) {
      return NextResponse.json({ error: "Respuesta vacía del modelo" }, { status: 502 });
    }

    // parseamos
    const { story, options, isFinal } = parseStoryResponse(text, optionsCount);
    if (!isFinal && story) {
      const fp = computeFingerprint({ chapterText: story, genres });
      pushFingerprint(fp);
    }

    return NextResponse.json({ story, options, isFinal, raw: text });
  } catch (err: any) {
    console.error("api/story error:", err);
    return NextResponse.json({ error: "Error al procesar la solicitud" }, { status: 500 });
  }
}
