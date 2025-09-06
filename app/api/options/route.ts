import createChatCompletion from "@/lib/groqClient";
import { validateOptions } from "@/lib/optionGuard";
import { limitTemperature, limitTopP } from "@/lib/sampling";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const MAX_OPTIONS = 5;

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  /*if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }*/
  try {
    const { prompt, numOptions, temperature, top_p } = await req.json();
    const safeTemperature = limitTemperature(temperature);
    const safeTopP = limitTopP(top_p);

    const count = Number(numOptions) || 1;
    if (count > MAX_OPTIONS) {
      return Response.json(
        { error: `numOptions cannot exceed ${MAX_OPTIONS}` },
        { status: 400 }
      );
    }

    const rawOptions: string[] = [];
    let validOptions: string[] = [];    
    let attempts = 0;
    const maxAttempts = count + 2;
    while (validOptions.length < count && attempts < maxAttempts) {
      attempts++;
      const completion = await createChatCompletion({
        model: "moonshotai/kimi-k2-instruct",
        messages: [{ role: "user", content: prompt }],
        n: 1,
        temperature: safeTemperature,
        top_p: safeTopP,
      });

      const option = completion.choices[0]?.message.content?.trim();
      if (option) {
        rawOptions.push(option);
        const result = validateOptions(rawOptions, count);
        validOptions = result.valid;        
      }
      console.log("options progress", {
        expected: count,
        received: validOptions.length,
        attempts,
      });
    }

    if (validOptions.length < count) {
      console.warn("Fewer valid options generated than requested", {
        expected: count,
        received: validOptions.length,
        attempts,
        
      });
      return Response.json(
        {
          error: `Generated ${validOptions.length} of ${count} options`,
          options: validOptions,
          
        },
        { status: 502 },
      );
    }

    console.log("Groq options response", validOptions);

    return Response.json({ options: validOptions });
  } catch (err) {
    console.error(err);
    return Response.json({ error: "Error generating options" }, { status: 500 });
  }
}

