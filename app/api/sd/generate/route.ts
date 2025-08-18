// app/api/sd/generate/route.ts
export async function POST(req: Request) {
  const body = await req.json();

  // Tu backend de SDXL (ponelo en .env si querés)
  const SD_API = process.env.SD_API_URL 
    ?? "https://tbhvrp51-8000.brs.devtunnels.ms";

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
}
