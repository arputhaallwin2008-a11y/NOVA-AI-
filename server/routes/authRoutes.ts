import express, { Response } from 'express';
import crypto from 'crypto';
import { getDb, queryOne, execute, saveDbSync } from '../db.ts';
import { hashPassword, verifyPassword, createToken, requireAuth, AuthenticatedRequest } from '../auth.ts';

const router = express.Router();

// Register new user
router.post('/register', async (req, res) => {
  try {
    const { email, password, displayName } = req.body;

    if (!email || !password || !displayName) {
      res.status(400).json({ error: 'Please provide email, password, and your name.' });
      return;
    }

    if (password.length < 6) {
      res.status(400).json({ error: 'Password must be at least 6 characters long.' });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      res.status(400).json({ error: 'Please provide a valid email address.' });
      return;
    }

    const db = await getDb();
    const existing = queryOne(db, 'SELECT id FROM users WHERE LOWER(email) = LOWER(?)', [email.trim()]);
    if (existing) {
      res.status(409).json({ error: 'An account with this email already exists.' });
      return;
    }

    const userId = crypto.randomUUID();
    const passwordHash = hashPassword(password);
    const now = new Date().toISOString();

    execute(
      db,
      'INSERT INTO users (id, display_name, email, password_hash, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
      [userId, displayName.trim(), email.trim().toLowerCase(), passwordHash, now, now]
    );

    // Create default user preferences
    execute(
      db,
      'INSERT INTO user_preferences (user_id, theme, preferred_language, voice_enabled, voice_name, system_prompt, web_search_enabled, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [userId, 'dark', 'en', 1, 'Zephyr', '', 1, now]
    );

    saveDbSync();

    const userPayload = {
      id: userId,
      email: email.trim().toLowerCase(),
      displayName: displayName.trim(),
    };

    const token = createToken(userPayload);
    res.status(201).json({
      token,
      user: userPayload,
      message: 'Account created successfully!',
    });
  } catch (err: any) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Failed to create account. Please try again.' });
  }
});

// Login user
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required.' });
      return;
    }

    const db = await getDb();
    const user = queryOne(
      db,
      'SELECT id, display_name, email, password_hash FROM users WHERE LOWER(email) = LOWER(?)',
      [email.trim()]
    );

    if (!user || !verifyPassword(password, user.password_hash)) {
      res.status(401).json({ error: 'Invalid email or password.' });
      return;
    }

    const userPayload = {
      id: user.id,
      email: user.email,
      displayName: user.display_name,
    };

    const token = createToken(userPayload);
    res.json({
      token,
      user: userPayload,
      message: 'Signed in successfully!',
    });
  } catch (err: any) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Failed to sign in. Please try again.' });
  }
});

// Quick Guest / Demo Login
router.post('/guest', async (_req, res) => {
  try {
    const db = await getDb();
    const guestId = 'guest_' + crypto.randomUUID().slice(0, 8);
    const guestEmail = `${guestId}@nova.internal`;
    const guestName = 'Nova Explorer';
    const now = new Date().toISOString();
    const passwordHash = hashPassword('guest-demo-mode-2026');

    execute(
      db,
      'INSERT INTO users (id, display_name, email, password_hash, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
      [guestId, guestName, guestEmail, passwordHash, now, now]
    );

    execute(
      db,
      'INSERT INTO user_preferences (user_id, theme, preferred_language, voice_enabled, voice_name, system_prompt, web_search_enabled, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [guestId, 'dark', 'en', 1, 'Zephyr', '', 1, now]
    );

    saveDbSync();

    const userPayload = {
      id: guestId,
      email: guestEmail,
      displayName: guestName,
    };

    const token = createToken(userPayload);
    res.json({
      token,
      user: userPayload,
      message: 'Welcome to NOVA AI Guest Preview!',
    });
  } catch (err: any) {
    console.error('Guest login error:', err);
    res.status(500).json({ error: 'Failed to initialize guest mode.' });
  }
});

// Get current user profile & preferences
router.get('/me', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const db = await getDb();
    const user = queryOne(
      db,
      'SELECT id, display_name, email, avatar_url, created_at FROM users WHERE id = ?',
      [req.user!.id]
    );

    if (!user) {
      res.status(404).json({ error: 'User not found.' });
      return;
    }

    const preferences = queryOne(
      db,
      'SELECT theme, preferred_language, voice_enabled, voice_name, system_prompt, web_search_enabled FROM user_preferences WHERE user_id = ?',
      [req.user!.id]
    );

    res.json({
      user: {
        id: user.id,
        email: user.email,
        displayName: user.display_name,
        avatarUrl: user.avatar_url,
        createdAt: user.created_at,
      },
      preferences: preferences || {
        theme: 'dark',
        preferred_language: 'en',
        voice_enabled: 1,
        voice_name: 'Zephyr',
        system_prompt: '',
        web_search_enabled: 1,
      },
    });
  } catch (err: any) {
    console.error('Error fetching user profile:', err);
    res.status(500).json({ error: 'Failed to fetch user profile.' });
  }
});

// Update Profile
router.put('/profile', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { displayName, avatarUrl } = req.body;
    if (!displayName || !displayName.trim()) {
      res.status(400).json({ error: 'Display name cannot be empty.' });
      return;
    }

    const db = await getDb();
    const now = new Date().toISOString();
    execute(
      db,
      'UPDATE users SET display_name = ?, avatar_url = ?, updated_at = ? WHERE id = ?',
      [displayName.trim(), avatarUrl || null, now, req.user!.id]
    );

    saveDbSync();
    res.json({
      message: 'Profile updated successfully.',
      user: {
        id: req.user!.id,
        email: req.user!.email,
        displayName: displayName.trim(),
        avatarUrl,
      },
    });
  } catch (err: any) {
    console.error('Error updating profile:', err);
    res.status(500).json({ error: 'Failed to update profile.' });
  }
});

// Delete Account & All Data
router.delete('/account', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const db = await getDb();
    const userId = req.user!.id;

    // Delete all user related rows
    execute(db, 'DELETE FROM starred_items WHERE user_id = ?', [userId]);
    execute(db, 'DELETE FROM user_memory WHERE user_id = ?', [userId]);
    execute(db, 'DELETE FROM generated_images WHERE user_id = ?', [userId]);
    execute(db, 'DELETE FROM user_preferences WHERE user_id = ?', [userId]);
    execute(db, 'DELETE FROM messages WHERE conversation_id IN (SELECT id FROM conversations WHERE user_id = ?)', [userId]);
    execute(db, 'DELETE FROM conversations WHERE user_id = ?', [userId]);
    execute(db, 'DELETE FROM users WHERE id = ?', [userId]);

    saveDbSync();
    res.json({ message: 'Account and all associated data permanently deleted.' });
  } catch (err: any) {
    console.error('Error deleting account:', err);
    res.status(500).json({ error: 'Failed to delete account.' });
  }
});

export default router;
