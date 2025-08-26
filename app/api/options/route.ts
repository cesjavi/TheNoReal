import createChatCompletion from "@/lib/groqClient";

const MAX_OPTIONS = 5;

export async function POST(req: Request) {
  try {
    const { prompt, numOptions, temperature, top_p } = await req.json();

    const count = Number(numOptions) || 1;
    if (count > MAX_OPTIONS) {
      return Response.json(
        { error: `numOptions cannot exceed ${MAX_OPTIONS}` },
        { status: 400 }
      );
    }

    let options: string[] = [];
    for (let attempt = 0; attempt < 2; attempt++) {
      const completion = await createChatCompletion({
        model: "openai/gpt-oss-120b",
        messages: [{ role: "user", content: prompt }],
        n: count,
        temperature,
        top_p,
      });

      options = completion.choices
        .map((choice) => choice.message.content?.trim())
        .filter(Boolean) as string[];

      console.log("options count", { expected: count, received: options.length });
      if (options.length === count) {
        break;
      }
    }

    if (options.length !== count) {
      return Response.json({ error: "Error generating options" }, { status: 502 });
    }

    return Response.json({ options });
  } catch (err) {
    console.error(err);
    return Response.json({ error: "Error generating options" }, { status: 500 });
  }
}

