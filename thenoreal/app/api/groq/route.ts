import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const { history, choice } = await req.json();

  const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'llama3-8b-8192',
      messages: [
        {
          role: 'system',
          content:
            'Eres un narrador interactivo. Continua la historia y devuelve un objeto JSON con las claves "texto" y "opciones".',
        },
        {
          role: 'user',
          content: `Historia: ${history}\nOpcion elegida: ${choice}`,
        },
      ],
    }),
  });

  const groqData = await groqRes.json();
  let text = '';
  let options: string[] = [];

  try {
    const parsed = JSON.parse(groqData.choices[0].message.content);
    text = parsed.texto ?? '';
    options = parsed.opciones ?? [];
  } catch {
    text = groqData.choices?.[0]?.message?.content ?? '';
  }

  return NextResponse.json({ text, options });
}

