const ENDPOINT = 'https://tbhvrp51-8000.brs.devtunnels.ms/generate';

export async function generateImage(prompt: string): Promise<string> {
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt,
      engine: 'sdxl-turbo',
      width: 128,
      height: 128,
      steps: 2,
    }),
  });

  if (!res.ok) {
    throw new Error(`Image generation failed: ${res.status} ${res.statusText}`);
  }

  const data = await res.json();
  const url =
    data.url ||
    data.image ||
    data.image_url ||
    (Array.isArray(data.images)
      ? typeof data.images[0] === 'string'
        ? data.images[0]
        : data.images[0]?.url
      : undefined) ||
    (Array.isArray(data.output)
      ? typeof data.output[0] === 'string'
        ? data.output[0]
        : data.output[0]?.url
      : undefined);

  if (!url) throw new Error('Image URL not found in response');

  return url;
}

export default generateImage;
