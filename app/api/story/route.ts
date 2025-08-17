import { NextResponse } from "next/server";
import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function POST(req: Request) {
  if (!process.env.GROQ_API_KEY) {
    return NextResponse.json(
      { error: "GROQ_API_KEY is not defined" },
      { status: 500 }
    );
  }

  try {
    const { story, option, optionsPerDecision } = await req.json();

    const completion = await groq.chat.completions.create({
      model: "openai/gpt-oss-120b",
      messages: [
        {
          role: "system",
          content:
            "Eres un generador de historias ramificadas. Responde con el siguiente capítulo seguido de las opciones solicitadas, cada una en una línea.",
        },
        {
          role: "user",
          content: `${story}\n\nOpción elegida: ${option}\n\nGenera ${optionsPerDecision} opciones para continuar la historia.`,
        },
      ],
    });

    const text = completion.choices?.[0]?.message?.content || "";

    return NextResponse.json({ text });
  } catch (error) {
    console.error("Error al consultar la API de Groq", error);
    return NextResponse.json({ error: "Error al consultar la API de Groq" }, { status: 500 });
  }
}
