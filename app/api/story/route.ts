import { NextResponse } from "next/server";
import createChatCompletion from "@/lib/groqClient";
import fs from "fs";
import path from "path";

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
      finalize = false,
      language = "es",
    } = await req.json();

    const messagesPath = path.join(process.cwd(), "public", "locales", language, "api.json");
    const messages = JSON.parse(fs.readFileSync(messagesPath, "utf-8"));

    const t = (key: string, params: Record<string, any> = {}) => {
      const parts = key.split(".");
      let result: any = messages;
      for (const p of parts) result = result?.[p];
      if (typeof result === "string") {
        return result.replace(/\{(\w+)\}/g, (_, k) => params[k]);
      }
      return "";
    };

    const genreLine =
      Array.isArray(genres) && genres.length > 0
        ? t("genreLine", { genres: genres.join(', ') })
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

    const estiloLine = formatSection(t('styleTitle'), estilo);
    const ajustesLine = formatSection(t('settingsTitle'), ajustes);

    const systemPrompt = [
      t('system.intro'),
      t('system.chapterLimit'),
      t('system.finalMode'),
      t('system.finalText'),
      t('system.nonFinal'),
      t('system.noExtra'),
      genreLine,
      estiloLine,
      ajustesLine,
    ]
      .filter(Boolean)
      .join("\n\n");

    const userPrompt = finalize
      ? `${story}\n\n${t('user.final')}`
      : `${story}\n\n${t('user.continue', { option, options: optionsPerDecision })}`;

    const chatMessages = [
      {
        role: "system" as const,
        content: systemPrompt,
      },
      {
        role: "user" as const,
        content: userPrompt,
      },
    ];

    console.log('Mensajes enviados a Groq:', chatMessages);

    const { temperature, top_p } = ajustes as {
      temperature?: number;
      top_p?: number;
    };

    const completion = await createChatCompletion({
      model: "openai/gpt-oss-120b",//"moonshotai/kimi-k2-instruct",//"deepseek-r1-distill-llama-70b",//"openai/gpt-oss-120b",
      messages: chatMessages,
      temperature,
      top_p,
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
