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
  _timeoutMs: number = Number(process.env.EXPO_PUBLIC_IMAGE_TIMEOUT) || 15000
): Promise<{ url: string | null; truncated: boolean }> {
  const { text: truncatedPrompt, truncated } = truncatePrompt(prompt);
  const seed = encodeURIComponent(`${truncatedPrompt}${genres.join('-')}`);
  // Use a deterministic placeholder image service for now
  const url = `https://picsum.photos/seed/${seed}/512/512`;
  return { url, truncated };
}

export default generateImage;
