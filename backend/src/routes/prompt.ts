import { Router } from 'express';
import type { RequestHandler } from 'express';
import createChatCompletion from '@thenoreal/shared/lib/groqClient';

const router = Router();

const ensureApiKey = () => {
  if (!process.env.GROQ_API_KEY) {
    throw new Error('GROQ_API_KEY is not configured');
  }
};

const generateHandler: RequestHandler = async (req, res) => {
  try {
    ensureApiKey();
    const { config } = req.body ?? {};
    if (!config) {
      return res.status(400).json({ error: 'config is required' });
    }

    const model = process.env.GROQ_MODEL || 'openai/gpt-oss-120b';
    const completion = await createChatCompletion({
      model,
      messages: [
        {
          role: 'system',
          content:
            'Genera una semilla de historia creativa basada en la configuración proporcionada. La semilla debe ser un texto corto y conciso, de alrededor de 30 palabras.',
        },
        { role: 'user', content: JSON.stringify(config) },
      ],
    });

    const prompt = completion.choices[0]?.message?.content?.trim();
    if (!prompt) {
      throw new Error('Empty response from model');
    }

    return res.json({ prompt });
  } catch (error) {
    console.error('generate prompt error:', error);
    const status = error instanceof Error && error.message.includes('GROQ_API_KEY') ? 400 : 500;
    const message = status === 400 ? error : 'Error generating prompt';
    return res.status(status).json({ error: message instanceof Error ? message.message : message });
  }
};

const improveHandler: RequestHandler = async (req, res) => {
  try {
    ensureApiKey();
    const { prompt } = req.body ?? {};
    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ error: 'prompt is required' });
    }

    const model = process.env.GROQ_MODEL || 'openai/gpt-oss-120b';
    const completion = await createChatCompletion({
      model,
      messages: [
        {
          role: 'system',
          content:
            'Eres un asistente que mejora prompts manteniendo la intención original. La semilla debe ser un texto corto y conciso, de alrededor de 30 palabras.',
        },
        { role: 'user', content: prompt },
      ],
    });

    const improved = completion.choices[0]?.message?.content?.trim();
    if (!improved) {
      throw new Error('Empty response from model');
    }

    return res.json({ prompt: improved });
  } catch (error) {
    console.error('improve prompt error:', error);
    const status = error instanceof Error && error.message.includes('GROQ_API_KEY') ? 400 : 500;
    const message = status === 400 ? error : 'Error improving prompt';
    return res.status(status).json({ error: message instanceof Error ? message.message : message });
  }
};

router.post('/generate', generateHandler);
router.post('/improve', improveHandler);

export default router;
