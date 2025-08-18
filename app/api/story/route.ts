import { NextResponse } from "next/server";
import createChatCompletion from "@/lib/groqClient";

export async function POST(req: Request) {
  if (!process.env.GROQ_API_KEY) {
    return NextResponse.json(
      { error: "GROQ_API_KEY is not defined" },
      { status: 500 }
    );
  }

  try {
    const { story, option, optionsPerDecision, genres } = await req.json();

    const genreLine =
      Array.isArray(genres) && genres.length > 0
        ? `Géneros a respetar: ${genres.join(', ')}.`
        : '';

    const systemPrompt = [
      "Eres un generador de historias ramificadas. Responde con el siguiente capítulo seguido de las opciones solicitadas, cada una en una línea.",
      genreLine,
    ]
      .filter(Boolean)
      .join("\n\n");

    const completion = await createChatCompletion({
      model: "openai/gpt-oss-120b",
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: `${story}\n\nOpción elegida: ${option}\n\nGenera ${optionsPerDecision} opciones para continuar la historia.`,
        },
      ],
    });

    const text =
      'choices' in completion
        ? completion.choices?.[0]?.message?.content || ""
        : "";

    return NextResponse.json({ text });
  } catch (error) {
    console.error("Error al consultar la API de Groq", error);
    return NextResponse.json({ error: "Error al consultar la API de Groq" }, { status: 500 });
  }
}
