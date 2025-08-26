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

    const options: string[] = [];
    let attempts = 0;
    const maxAttempts = count + 2;
    while (options.length < count && attempts < maxAttempts) {
      attempts++;
      const completion = await createChatCompletion({
        model: "openai/gpt-oss-120b",
        messages: [{ role: "user", content: prompt }],
        n: 1,
        temperature,
        top_p,
      });

      const option = completion.choices[0]?.message.content?.trim();
      if (option) {
        options.push(option);
      }
      console.log("options progress", {
        expected: count,
        received: options.length,
        attempts,
      });
    }

    const uniqueOptions = Array.from(new Set(options.map((o) => o.trim()))).filter(
      Boolean,
    );

    if (uniqueOptions.length < count) {
      console.warn("Fewer options generated than requested", {
        expected: count,
        received: uniqueOptions.length,
        attempts,
      });
      return Response.json(
        {
          error: `Generated ${uniqueOptions.length} of ${count} options`,
          options: uniqueOptions,
        },
        { status: 502 },
      );
    }

    console.log("Groq options response", uniqueOptions);

    return Response.json({ options: uniqueOptions });
  } catch (err) {
    console.error(err);
    return Response.json({ error: "Error generating options" }, { status: 500 });
  }
}

