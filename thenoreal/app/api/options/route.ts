import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function POST(req: Request) {
  const { prompt, numOptions } = await req.json();

  const completion = await groq.chat.completions.create({
    model: "llama3-8b-8192",
    messages: [{ role: "user", content: prompt }],
    n: numOptions ?? 1,
  });

  const options = completion.choices
    .map((c) => c.message?.content?.trim())
    .filter(Boolean);

  return Response.json({ options });
}

