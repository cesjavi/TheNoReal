import { Router } from 'express';
import type { RequestHandler } from 'express';
import { randomUUID } from 'node:crypto';
import Groq from 'groq-sdk';
import type { ChatCompletion } from 'groq-sdk/resources/chat/completions';
import {
  SYSTEM_PROMPT_V3,
  buildUserMessage,
  buildMeta,
  computeFingerprint,
  pushFingerprint,
  getRecentFingerprints,
  isFingerprintTooSimilar,
  parseStoryResponse,
  limitTemperature,
  limitTopP,
} from '@thenoreal/shared';

const router = Router();

let groqClient: Groq | null = null;

function getGroqClient(): Groq {
  if (!groqClient) {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      throw new Error('GROQ_API_KEY no configurada');
    }
    groqClient = new Groq({ apiKey });
  }
  return groqClient;
}

type ChatMsg = { role: 'system' | 'user' | 'assistant'; content: string };
type Ajustes = { temperature?: number; top_p?: number; targetWords?: number; evitar?: string[] };
type StoryRequest = {
  story?: string;
  option?: string;
  optionsPerDecision?: number;
  genres?: string[];
  estilo?: Record<string, unknown>;
  ajustes?: Ajustes;
  language?: string;
  endingMode?: string;
  chaptersCount?: number;
  finalize?: boolean;
};

type ChatCompletionResult = ChatCompletion;

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((entry) => typeof entry === 'string');
}

function isStoryRequest(value: unknown): value is StoryRequest {
  if (!isObject(value)) return false;
  if ('genres' in value) {
    const candidate = (value as { genres?: unknown }).genres;
    if (!isStringArray(candidate)) return false;
  }
  return true;
}

const REQUEST_TIMEOUT_MS = Number(process.env.GROQ_REQUEST_TIMEOUT_MS ?? '30000');

async function withTimeout<T>(promise: Promise<T>, ms = REQUEST_TIMEOUT_MS): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error('timeout')), ms)),
  ]);
}

const MODEL_PRIORITY = [
  process.env.GROQ_MODEL || 'moonshotai/kimi-k2-instruct',
  'gpt-oss-20b',
];

const storyHandler: RequestHandler = async (req, res) => {
  const requestId = randomUUID();

  const allowAnonymous = process.env.ALLOW_ANON_STORY_API !== '0';
  if (!allowAnonymous) {
    return res.status(401).json({
      error: 'Unauthorized',
      detail: 'Set ALLOW_ANON_STORY_API to enable unauthenticated access.',
      requestId,
    });
  }

  if (!process.env.GROQ_API_KEY) {
    return res.status(400).json({ error: 'GROQ_API_KEY no configurada', requestId });
  }

  try {
    const groq = getGroqClient();
    const raw = req.body as unknown;
    if (!isStoryRequest(raw)) {
      return res.status(400).json({ error: 'Bad request', requestId });
    }

    const {
      story: storyText = '',
      option: chosenOption = '',
      optionsPerDecision = 2,
      genres = [],
      estilo = {},
      ajustes = {} as Ajustes,
      language = 'es',
      endingMode,
      chaptersCount,
      finalize = false,
    } = raw;

    const isFirstTurn = !/\n>\s*/.test(storyText);
    if (!finalize && !isFirstTurn && !chosenOption?.trim()) {
      return res.status(400).json({ error: 'Missing option', requestId });
    }

    const baseTemp = limitTemperature(ajustes?.temperature) ?? 0.75;
    const baseTopP = limitTopP(ajustes?.top_p) ?? 0.9;
    const optionsCount = Number(optionsPerDecision) || 2;
    const targetWords = typeof ajustes?.targetWords === 'number' ? ajustes.targetWords : 220;

    const { evitar = [], ...ajustesRest } = ajustes || {};
    const bannedKeywords: string[] = Array.isArray(evitar)
      ? evitar.map(String).map((s) => s.trim()).filter((s) => s.length > 0)
      : [];

    const metaBase = buildMeta({
      optionsCount,
      targetWords,
      recentFingerprints: getRecentFingerprints(),
      bannedCliches: [
        'todo fue un sueño',
        'llamadas sin identificador',
        'hospital psiquiátrico abandonado',
      ],
      bannedKeywords,
      isFirstTurn,
    });

    const metaConfigLines = [
      `language=${language}`,
      `genres=[${genres.map((g) => JSON.stringify(g)).join(', ')}]`,
      endingMode ? `ending_mode=${endingMode}` : null,
      Number.isFinite(chaptersCount) ? `chapters_count=${chaptersCount}` : null,
      `estilo=${JSON.stringify(estilo)}`,
      `ajustes=${JSON.stringify(ajustesRest)}`,
      finalize ? `finalize_now=true` : null,
    ].filter(Boolean) as string[];

    const metaBlock = [metaBase.trim(), ...metaConfigLines].join('\n');

    const userContentBase = buildUserMessage({
      text: [storyText, finalize ? '\nFinaliza ahora.' : ''].join(''),
      chosenOption,
      optionsCount,
      targetWords,
      metaBlock,
    });

    const maxRetriesPerModel = 3;

    for (const model of MODEL_PRIORITY) {
      for (let attempt = 0; attempt <= maxRetriesPerModel; attempt++) {
        const temperature = Math.min(baseTemp + attempt * 0.15, 1.3);
        const top_p = Math.min(baseTopP + attempt * 0.05, 1.0);

        const antiRepetition =
          attempt > 0
            ? `\n\n[ANTI_REPETITION]\nEvita repetir tramas o giros usados antes. Sé más específico, original y ligado a ${JSON.stringify(
                genres,
              )}.`
            : '';

        const messages: ChatMsg[] = [
          { role: 'system', content: SYSTEM_PROMPT_V3 },
          { role: 'user', content: userContentBase + antiRepetition },
        ];

        try {
          const completion = await withTimeout<ChatCompletionResult>(
            groq.chat.completions.create({
              model,
              messages,
              temperature,
              top_p,
              stream: false,
            }),
          );

          const text: string = completion?.choices?.[0]?.message?.content ?? '';
          if (!text) {
            if (attempt < maxRetriesPerModel) continue;
            break;
          }

          const { story, options, isFinal } = parseStoryResponse(text, optionsCount);

          if (!isFinal && !finalize && story) {
            const fp = computeFingerprint({ chapterText: story, genres });
            const similar = isFingerprintTooSimilar(fp, getRecentFingerprints());
            if (similar) {
              if (attempt < maxRetriesPerModel) continue;
              return res.json({ story, options, isFinal, similar: true });
            }
            pushFingerprint(fp);
          }

          return res.json({ story, options, isFinal });
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          console.error(`[${requestId}] Error con modelo ${model} (intento ${attempt}):`, message);
          if (attempt >= maxRetriesPerModel) {
            break;
          }
        }
      }
    }

    return res
      .status(502)
      .json({ error: 'Todos los modelos fallaron', requestId });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[${requestId}] api/story error:`, message);
    return res
      .status(500)
      .json({ error: 'Error al procesar la solicitud', detail: message, requestId });
  }
};

router.post('/', storyHandler);

export default router;
