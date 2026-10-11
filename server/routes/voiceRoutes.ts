import express, { Response } from 'express';
import { requireAuth, AuthenticatedRequest } from '../auth.ts';
import { generateSpeechAudio } from '../gemini.ts';

const router = express.Router();

router.post('/tts', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { text, voice = 'Zephyr' } = req.body;

    if (!text || !text.trim()) {
      res.status(400).json({ error: 'Text to speak cannot be empty.' });
      return;
    }

    const { base64Audio, mimeType } = await generateSpeechAudio({
      text: text.trim(),
      voice,
    });

    res.json({
      audioUrl: `data:${mimeType};base64,${base64Audio}`,
      mimeType,
    });
  } catch (err: any) {
    console.error('TTS error:', err);
    res.status(500).json({ error: err.message || 'Text-to-speech synthesis failed.' });
  }
});

export default router;
