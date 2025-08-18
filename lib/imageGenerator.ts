const env = process.env.NEXT_PUBLIC_SD_API?.trim();
// Si NO hay env, usamos el proxy de Next:
const SD_API = env && env.length > 0 ? env : '/api/sd/generate';

export const GENRE_STYLE: Record<string, string> = {
  fantasy: 'fantasía épica',
  scifi: 'ciencia ficción futurista',
  horror: 'horror oscuro',
  romance: 'romance suave',
};

const BASE_STYLE =
  'tinta minimalista, fondo blanco, el dibujo tiene que interpretar la historia relatada en el prompt';

export async function generateImage(
  prompt: string,
  genres: string[] = []
): Promise<string> {
  const finalPromptImagen = `${prompt}. Estilo visual: ${[
    BASE_STYLE,
    ...genres.map((g) => GENRE_STYLE[g] ?? g),
  ].join(', ')}`;
  const res = await fetch(SD_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt: finalPromptImagen,
      engine: 'sdxl-turbo',
      width: 512,
      height: 512,
      steps: 10,
    }),
  });

  if (!res.ok) {
    throw new Error(`Image generation failed: ${res.status} ${res.statusText}`);
  }

  const data = await res.json();

  // Compat con múltiples “shapes”
  const url =
    data?.data?.[0]?.url ||                // OpenAI-style (proxy)
    data?.image_url ||                      // data URL directo (proxy)
    data?.url ||
    data?.image ||
    (Array.isArray(data?.images)
      ? (typeof data.images[0] === 'string' ? data.images[0] : data.images[0]?.url)
      : undefined) ||
    (Array.isArray(data?.output)
      ? (typeof data.output[0] === 'string' ? data.output[0] : data.output[0]?.url)
      : undefined) ||
    (data?.image_base64
      ? `data:image/png;base64,${data.image_base64}` // FastAPI directo
      : undefined);

  if (!url) throw new Error('Image URL not found in response');
  return url;
}

export default generateImage;
