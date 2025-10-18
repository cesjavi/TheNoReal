import { Router } from 'express';
import type { RequestHandler } from 'express';
import createChatCompletion from '@thenoreal/shared/lib/groqClient';
import { validateOptions } from '@thenoreal/shared/lib/optionGuard';
import { limitTemperature, limitTopP } from '@thenoreal/shared/lib/sampling';

const router = Router();
const MAX_OPTIONS = 5;

const optionsHandler: RequestHandler = async (req, res) => {
  try {
    const { prompt, numOptions, temperature, top_p } = req.body ?? {};
    const safeTemperature = limitTemperature(temperature);
    const safeTopP = limitTopP(top_p);

    const count = Number(numOptions) || 1;
    if (count > MAX_OPTIONS) {
      return res
        .status(400)
        .json({ error: `numOptions cannot exceed ${MAX_OPTIONS}` });
    }

    const rawOptions: string[] = [];
    let validOptions: string[] = [];
    let attempts = 0;
    const maxAttempts = count + 2;

    while (validOptions.length < count && attempts < maxAttempts) {
      attempts++;
      const completion = await createChatCompletion({
        model: 'moonshotai/kimi-k2-instruct',
        messages: [{ role: 'user', content: prompt }],
        n: 1,
        temperature: safeTemperature,
        top_p: safeTopP,
      });

      const option = completion.choices[0]?.message?.content?.trim();
      if (option) {
        rawOptions.push(option);
        const result = validateOptions(rawOptions, count);
        validOptions = result.valid;
      }

      console.log('options progress', {
        expected: count,
        received: validOptions.length,
        attempts,
      });
    }

    if (validOptions.length < count) {
      console.warn('Fewer valid options generated than requested', {
        expected: count,
        received: validOptions.length,
        attempts,
      });
      return res.status(502).json({
        error: `Generated ${validOptions.length} of ${count} options`,
        options: validOptions,
      });
    }

    console.log('Groq options response', validOptions);
    return res.json({ options: validOptions });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Error generating options' });
  }
};

router.post('/', optionsHandler);

export default router;
