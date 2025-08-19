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
    const {
      story,
      option,
      optionsPerDecision,
      genres,
      estilo = {},
      ajustes = {},
    } = await req.json();

    const genreLine =
      Array.isArray(genres) && genres.length > 0
        ? `Géneros a respetar: ${genres.join(', ')}.`
        : '';

    const formatSection = (
      title: string,
      data: Record<string, unknown>
    ): string => {
      const entries = Object.entries(data)
        .filter(([, v]) =>
          Array.isArray(v) ? (v as unknown[]).length > 0 : v !== undefined
        )
        .map(([k, v]) => {
          const key = k.replace(/([A-Z])/g, ' $1').toLowerCase();
          const value = Array.isArray(v) ? (v as unknown[]).join(', ') : v;
          return `${key}: ${value}`;
        });
      return entries.length > 0 ? `${title}: ${entries.join('; ')}.` : '';
    };

    const estiloLine = formatSection('Estilo', estilo);
    const ajustesLine = formatSection('Ajustes', ajustes);

    const systemPrompt = [
      "Eres un generador de historias ramificadas. Responde con el siguiente capítulo seguido de las opciones solicitadas, cada una en una línea.",
      genreLine,
      estiloLine,
      ajustesLine,
    ]
      .filter(Boolean)
      .join("\n\n");

    const messages = [
      {
        role: "system" as const,
        content: systemPrompt,
      },
      {
        role: "user" as const,
        content: `${story}\n\nOpción elegida: ${option}\n\nGenera ${optionsPerDecision} opciones para continuar la historia.`,
      },
    ];

    console.log('Mensajes enviados a Groq:', messages);

    const completion = await createChatCompletion({
      model: "openai/gpt-oss-120b",
      messages,
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
