import express, { Response } from 'express';
import { requireAuth, AuthenticatedRequest } from '../auth.ts';
import { translateTextWithGemini } from '../gemini.ts';

const router = express.Router();

router.post('/', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { text, sourceLang = 'auto', targetLang = 'English' } = req.body;

    if (!text || !text.trim()) {
      res.status(400).json({ error: 'Text to translate cannot be empty.' });
      return;
    }

    const result = await translateTextWithGemini({
      text: text.trim(),
      sourceLang,
      targetLang,
    });

    res.json(result);
  } catch (err: any) {
    console.error('Translation error:', err);
    res.status(500).json({ error: err.message || 'Translation service failed.' });
  }
});

export default router;
