// app/api/sd/generate/route.ts
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json();

  // Tu backend de SDXL (ponelo en .env si querés)
  const SD_API = process.env.SD_API_URL 
    ?? "https://tbhvrp51-8000.brs.devtunnels.ms";

  try {
    const r = await fetch(SD_API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      // Importante: no enviar credenciales para evitar CORS raros
    });

    const text = await r.text();
    if (!r.ok) {
      return new Response(
        JSON.stringify({ error: text || "SD API error" }),
        { status: r.status, headers: { "Content-Type": "application/json" } }
      );
    }

    // Tu API devuelve { image_base64 }
    const { image_base64 } = JSON.parse(text);
    const image_url = `data:image/png;base64,${image_base64}`;

    // Devolvemos también data[0].url para compatibilidad "OpenAI-style"
    return new Response(
      JSON.stringify({ image_base64, image_url, data: [{ url: image_url }] }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        error:
          error instanceof Error
            ? error.message
            : "Error fetching SD API",
      }),
      { status: 502, headers: { "Content-Type": "application/json" } }
    );
  }
}
