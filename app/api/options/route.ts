import createChatCompletion from "@/lib/groqClient";

const MAX_OPTIONS = 5;

export async function POST(req: Request) {
  try {
    const { prompt, numOptions } = await req.json();

    const count = Number(numOptions) || 1;
    if (count > MAX_OPTIONS) {
      return Response.json(
        { error: `numOptions cannot exceed ${MAX_OPTIONS}` },
        { status: 400 }
      );
    }

    const completions = await Promise.all(
      Array.from({ length: count }).map(() =>
        createChatCompletion({
          model: "llama3-8b-8192",
          messages: [{ role: "user", content: prompt }],
          n: 1,
        })
      )
    );

    const options = completions
      .map((c) => c.choices[0]?.message?.content?.trim())
      .filter(Boolean);

    return Response.json({ options });
  } catch (err) {
    console.error(err);
    return Response.json({ error: "Error generating options" }, { status: 500 });
  }
}

