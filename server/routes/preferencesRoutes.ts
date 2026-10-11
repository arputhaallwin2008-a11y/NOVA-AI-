import express, { Response } from 'express';
import { getDb, queryOne, execute, saveDbSync } from '../db.ts';
import { requireAuth, AuthenticatedRequest } from '../auth.ts';

const router = express.Router();

// Get user preferences
router.get('/', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const db = await getDb();
    const userId = req.user!.id;

    let prefs = queryOne(
      db,
      'SELECT theme, preferred_language, voice_enabled, voice_name, system_prompt, web_search_enabled, updated_at FROM user_preferences WHERE user_id = ?',
      [userId]
    );

    if (!prefs) {
      const now = new Date().toISOString();
      execute(
        db,
        'INSERT INTO user_preferences (user_id, theme, preferred_language, voice_enabled, voice_name, system_prompt, web_search_enabled, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [userId, 'dark', 'en', 1, 'Zephyr', '', 1, now]
      );
      saveDbSync();
      prefs = {
        theme: 'dark',
        preferred_language: 'en',
        voice_enabled: 1,
        voice_name: 'Zephyr',
        system_prompt: '',
        web_search_enabled: 1,
        updated_at: now,
      };
    }

    res.json({ preferences: prefs });
  } catch (err: any) {
    console.error('Error fetching preferences:', err);
    res.status(500).json({ error: 'Failed to fetch preferences.' });
  }
});

// Update user preferences
router.put('/', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const {
      theme = 'dark',
      preferred_language = 'en',
      voice_enabled = 1,
      voice_name = 'Zephyr',
      system_prompt = '',
      web_search_enabled = 1,
    } = req.body;
    const userId = req.user!.id;
    const db = await getDb();
    const now = new Date().toISOString();

    execute(
      db,
      `INSERT INTO user_preferences (user_id, theme, preferred_language, voice_enabled, voice_name, system_prompt, web_search_enabled, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(user_id) DO UPDATE SET
        theme = excluded.theme,
        preferred_language = excluded.preferred_language,
        voice_enabled = excluded.voice_enabled,
        voice_name = excluded.voice_name,
        system_prompt = excluded.system_prompt,
        web_search_enabled = excluded.web_search_enabled,
        updated_at = excluded.updated_at`,
      [
        userId,
        theme,
        preferred_language,
        voice_enabled ? 1 : 0,
        voice_name,
        system_prompt || '',
        web_search_enabled ? 1 : 0,
        now,
      ]
    );

    saveDbSync();

    res.json({
      message: 'Preferences updated successfully.',
      preferences: {
        theme,
        preferred_language,
        voice_enabled: voice_enabled ? 1 : 0,
        voice_name,
        system_prompt,
        web_search_enabled: web_search_enabled ? 1 : 0,
        updated_at: now,
      },
    });
  } catch (err: any) {
    console.error('Error updating preferences:', err);
    res.status(500).json({ error: 'Failed to update preferences.' });
  }
});

export default router;
