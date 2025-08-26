const env = process.env.NEXT_PUBLIC_SD_API?.trim();
// Si NO hay env, usamos el proxy de Next:
const SD_API = env && env.length > 0 ? env : '/api/sd/generate';

export function truncatePrompt(
  prompt: string,
  maxTokens: number = 500
): { text: string; truncated: boolean } {
  const tokens = prompt.trim().split(/\s+/);
  const truncated = tokens.length > maxTokens;
  return {
    text: tokens.slice(0, maxTokens).join(' '),
    truncated,
  };
}

export async function generateImage(
  prompt: string,
  genres: string[] = [],
  timeoutMs: number = Number(process.env.NEXT_PUBLIC_IMAGE_TIMEOUT) || 15000
): Promise<{ url: string | null; truncated: boolean }> {
  const { text: truncatedPrompt, truncated } = truncatePrompt(prompt);
  const genrePrompt = genres.length > 0 ? `\nGéneros: ${genres.join(', ')}` : '';
  const finalPrompt = `${truncatedPrompt}${genrePrompt}\n\nEstilo: tinta minimalista, fondo blanco, el dibujo tiene que interpretar la historia relatada en el prompt`;


  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(SD_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: finalPrompt,
        engine: 'sdxl-turbo',
        width: 512,
        height: 512,
        steps: 10,
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      throw new Error(`Image generation failed: ${res.status} ${res.statusText}`);
    }

    const data = await res.json();

    // Compat con múltiples “shapes”
    const url =
      data?.data?.[0]?.url || // OpenAI-style (proxy)
      data?.image_url || // data URL directo (proxy)
      data?.url ||
      data?.image ||
      (Array.isArray(data?.images)
        ? typeof data.images[0] === 'string'
          ? data.images[0]
          : data.images[0]?.url
        : undefined) ||
      (Array.isArray(data?.output)
        ? typeof data.output[0] === 'string'
          ? data.output[0]
          : data.output[0]?.url
        : undefined) ||
      (data?.image_base64
        ? `data:image/png;base64,${data.image_base64}` // FastAPI directo
        : undefined);

    if (!url) throw new Error('Image URL not found in response');
    return { url, truncated };
  } catch (error: any) {
    if (error.name === 'AbortError') {
      return { url: null, truncated }; // Aborted by timeout
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export default generateImage;
