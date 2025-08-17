import Groq from 'groq-sdk';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

function filterSensitive(data: unknown): unknown {
  const secret = process.env.GROQ_API_KEY;
  if (!secret) return data;
  if (typeof data === 'string') {
    return data.replace(new RegExp(secret, 'g'), '[REDACTED]');
  }
  if (Array.isArray(data)) {
    return data.map(filterSensitive);
  }
  if (data && typeof data === 'object') {
    return Object.fromEntries(
      Object.entries(data as Record<string, unknown>).map(([k, v]) => [
        k,
        filterSensitive(v),
      ])
    );
  }
  return data;
}

export async function createChatCompletion(
  params: Parameters<typeof groq.chat.completions.create>[0]
) {
  console.log('groq.chat.completions.create called', {
    model: params.model,
    messages: filterSensitive(params.messages),
  });
  const result = await groq.chat.completions.create(params);
  console.log('groq.chat.completions.create result', filterSensitive(result));
  return result;
}

export default createChatCompletion;
