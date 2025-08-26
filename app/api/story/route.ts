import { NextResponse } from "next/server";
import createChatCompletion from "@/lib/groqClient";
import { buildSystemPrompt, buildUserMessage } from "@/lib/storyPrompt";
import { buildMeta } from "@/lib/meta";
import { computeFingerprint, pushFingerprint, getRecentFingerprints } from "@/lib/fingerprint";
import { parseStoryResponse } from "@/lib/parseStoryResponse";

export async function POST(req: Request) {
  if (!process.env.GROQ_API_KEY) {
    return NextResponse.json({ error: "GROQ_API_KEY no configurada" }, { status: 400 });
  }

  try {
    const body = await req.json();
    const storyText: string = body.story ?? "";
    const chosenOption: string = body.option ?? "";
    const optionsCount: number = Number(body.optionsPerDecision ?? 2) || 2;
    const genres: string[] = Array.isArray(body.genres) ? body.genres : [];
    const language: string = typeof body.language === "string" ? body.language : "neutral";
    const temperature: number = typeof body.ajustes?.temperature === "number" ? body.ajustes.temperature : 0.75;
    const top_p: number = typeof body.ajustes?.top_p === "number" ? body.ajustes.top_p : 0.9;
    const targetWords: number = typeof body.ajustes?.targetWords === "number" ? body.ajustes.targetWords : 220;
    // Define or import the Estilo type above if not already present
    type Estilo = any; // Replace 'any' with the actual structure if known
    
        const estilo: Estilo | undefined = body.estilo;

    const metaBlock = buildMeta({
      optionsCount,
      targetWords,
      recentFingerprints: getRecentFingerprints(),
      bannedCliches: ["todo fue un sueño", "llamadas sin identificador", "hospital psiquiátrico abandonado"],
    });

    const [systemContent, userContent] = await Promise.all([
      buildSystemPrompt(language),
      buildUserMessage({
        text: storyText,
        chosenOption,
        optionsCount,
        targetWords,
        metaBlock,
        language,
        genres,
      }),
    ]);

    const messages = [
      { role: "system", content: systemContent },
      { role: "user", content: userContent },
    ] as const;

    const model = process.env.GROQ_MODEL || "moonshotai/kimi-k2-instruct";
    const completion = await createChatCompletion({
      model,
      messages: messages as any,
      temperature,
      top_p,
    });

    const text: string =
      completion?.choices?.[0]?.message?.content ?? "";

    console.log("Groq story response", text);

    if (!text) {
      return NextResponse.json({ error: "Respuesta vacía del modelo" }, { status: 502 });
    }

    // Extraemos historia, opciones y flag final
    const { story, options, isFinal } = parseStoryResponse(text, optionsCount);

    // Fingerprint solo si no es final
    if (!isFinal && story) {
      const fp = computeFingerprint({ chapterText: story, genres });
      pushFingerprint(fp);
    }

    // Devolvemos datos estructurados en lugar del texto sin procesar
    return NextResponse.json({ story, options, isFinal });
  } catch (err: any) {
    console.error("api/story error:", err);
    return NextResponse.json({ error: "Error al procesar la solicitud" }, { status: 500 });
  }
}
