import { NextResponse } from "next/server";
import createChatCompletion from "@/lib/groqClient";

export async function POST(req: Request) {
  if (!process.env.GROQ_API_KEY) {
    return NextResponse.json(
      { error: "GROQ_API_KEY is not configured" },
      { status: 400 }
    );
  }

  try {
    const { config } = await req.json();
    if (!config) {
      return NextResponse.json(
        { error: "config is required" },
        { status: 400 }
      );
    }

    const model = process.env.GROQ_MODEL || "openai/gpt-oss-120b";
    const completion = await createChatCompletion({
      model,
      messages: [
        {
          role: "system",
          content:
            "Genera una semilla de historia creativa basada en la configuración proporcionada. La semilla debe ser un texto corto y conciso, de alrededor de 30 palabras.",
        },
        { role: "user", content: JSON.stringify(config) },
      ],
    });

    const prompt = completion.choices[0]?.message?.content?.trim();
    if (!prompt) {
      throw new Error("Empty response from model");
    }

    return NextResponse.json({ prompt });
  } catch (err) {
    console.error("generate prompt error:", err);
    return NextResponse.json(
      { error: "Error generating prompt" },
      { status: 500 }
    );
  }
}

