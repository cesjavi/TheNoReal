import Groq from 'groq-sdk';
import type {
  ChatCompletion,
  ChatCompletionChunk,
} from 'groq-sdk/resources/chat/completions';
import type { Stream } from 'groq-sdk/lib/streaming';

type ChatCompletionsClient = Groq['chat']['completions'];
type CompletionParams = Parameters<ChatCompletionsClient['create']>[0];

let cachedClient: Groq | null = null;

function getClient(): Groq {
  if (cachedClient) return cachedClient;
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error('GROQ_API_KEY environment variable is not set');
  }
  cachedClient = new Groq({ apiKey });
  return cachedClient;
}

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
  params: { stream: true } & CompletionParams
): Promise<Stream<ChatCompletionChunk>>;
export async function createChatCompletion(
  params: { stream?: false } & CompletionParams
): Promise<ChatCompletion>;
export async function createChatCompletion(
  params: CompletionParams
) {
  console.log('groq.chat.completions.create called', {
    model: params.model,
    messages: filterSensitive(params.messages),
  });
  const client = getClient();
  const result = await client.chat.completions.create(params);
  console.log('groq.chat.completions.create result', filterSensitive(result));
  return result;
}

export default createChatCompletion;
