import { NextResponse } from "next/server";
import createChatCompletion from "@/lib/groqClient";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  /*if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }*/
  if (!process.env.GROQ_API_KEY) {
    return NextResponse.json(
      { error: "GROQ_API_KEY is not configured" },
      { status: 400 }
    );
  }

  try {
    const { prompt } = await req.json();
    if (!prompt || typeof prompt !== "string") {
      return NextResponse.json(
        { error: "prompt is required" },
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
            "Eres un asistente que mejora prompts manteniendo la intención original. La semilla debe ser un texto corto y conciso, de alrededor de 30 palabras.",
        },
        { role: "user", content: prompt },
      ],
    });

    const improved = completion.choices[0]?.message?.content?.trim();
    if (!improved) {
      throw new Error("Empty response from model");
    }

    return NextResponse.json({ prompt: improved });
  } catch (err) {
    console.error("improve prompt error:", err);
    return NextResponse.json(
      { error: "Error improving prompt" },
      { status: 500 }
    );
  }
}

