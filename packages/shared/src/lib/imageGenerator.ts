// imageGenerator.ts
const rawApi = (process.env.NEXT_PUBLIC_SD_API ?? '').trim();
const SD_API: string = rawApi.length > 0 ? rawApi : '/api/sd/generate';

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

/** Posibles formas del JSON devuelto por distintos backends/proxies */
type OpenAIStyle = { data?: Array<{ url?: string } | Record<string, unknown>> };
type BasicUrl = { url?: string; image_url?: string; image?: string };
type ImagesArray = { images?: Array<string | { url?: string }> };
type OutputArray = { output?: Array<string | { url?: string }> };
type Base64Image = { image_base64?: string };
type AnyImageResponse = Partial<
  OpenAIStyle & BasicUrl & ImagesArray & OutputArray & Base64Image
>;

function firstStringUrl(arr?: Array<string | { url?: string }>): string | undefined {
  if (!Array.isArray(arr) || arr.length === 0) return undefined;
  const first = arr[0];
  return typeof first === 'string' ? first : first?.url;
}

function extractImageUrl(data: AnyImageResponse): string | undefined {
  return (
    data?.data?.[0] && typeof data.data[0] === 'object' && 'url' in data.data[0]
      ? (data.data[0] as { url?: string }).url
      : undefined
  ) ??
    data?.image_url ??
    data?.url ??
    data?.image ??
    firstStringUrl(data?.images) ??
    firstStringUrl(data?.output) ??
    (data?.image_base64 ? `data:image/png;base64,${data.image_base64}` : undefined);
}

function isAbortError(err: unknown): boolean {
  return !!err && typeof err === 'object' && 'name' in err && (err as { name?: string }).name === 'AbortError';
}

export async function generateImage(
  prompt: string,
  genres: string[] = [],
  timeoutMs: number = Number(process.env.NEXT_PUBLIC_IMAGE_TIMEOUT) || 15_000
): Promise<{ url: string | null; truncated: boolean }> {
  const { text: truncatedPrompt, truncated } = truncatePrompt(prompt);
  const genrePrompt = genres.length > 0 ? `\nGéneros: ${genres.join(', ')}` : '';
  const finalPrompt =
    `${truncatedPrompt}${genrePrompt}\n\n` +
    `Estilo: tinta minimalista, fondo blanco, el dibujo tiene que interpretar la historia relatada en el prompt`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(SD_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: finalPrompt,
        engine: 'sdxl-turbo' as const,
        width: 512,
        height: 512,
        steps: 10,
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      throw new Error(`Image generation failed: ${res.status} ${res.statusText}`);
    }

    const data = (await res.json()) as unknown;
    const url = extractImageUrl((data ?? {}) as AnyImageResponse);

    if (!url) throw new Error('Image URL not found in response');

    return { url, truncated };
  } catch (err: unknown) {
    if (isAbortError(err)) {
      // Abort por timeout
      return { url: null, truncated };
    }
    // re-lanzamos con mensaje tipado
    const message = err instanceof Error ? err.message : 'Unknown error';
    throw new Error(message);
  } finally {
    clearTimeout(timeout);
  }
}

export default generateImage;
