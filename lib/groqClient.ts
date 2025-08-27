import Groq from 'groq-sdk';
import type {
  ChatCompletion,
  ChatCompletionChunk,
} from 'groq-sdk/resources/chat/completions';
import type { Stream } from 'groq-sdk/lib/streaming';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export function filterSensitive(data: unknown): unknown {
  const secret = process.env.GROQ_API_KEY;
  if (!secret) return data;
  const escapedSecret = secret.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  if (typeof data === 'string') {
    return data.replace(new RegExp(escapedSecret, 'g'), '[REDACTED]');
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
  params: { stream: true } & Parameters<typeof groq.chat.completions.create>[0]
): Promise<Stream<ChatCompletionChunk>>;
export async function createChatCompletion(
  params: { stream?: false } & Parameters<typeof groq.chat.completions.create>[0]
): Promise<ChatCompletion>;
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
