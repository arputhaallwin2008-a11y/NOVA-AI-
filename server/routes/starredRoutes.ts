import express, { Response } from 'express';
import crypto from 'crypto';
import { getDb, queryAll, queryOne, execute, saveDbSync } from '../db.ts';
import { requireAuth, AuthenticatedRequest } from '../auth.ts';

const router = express.Router();

// List all starred items for user
router.get('/', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const db = await getDb();
    const userId = req.user!.id;

    const starred = queryAll(
      db,
      `SELECT s.id as star_id, s.created_at as starred_at,
              m.id as message_id, m.content, m.created_at as message_created_at, m.role, m.model_name,
              c.id as conversation_id, c.title as conversation_title
       FROM starred_items s
       JOIN messages m ON s.message_id = m.id
       JOIN conversations c ON m.conversation_id = c.id
       WHERE s.user_id = ?
       ORDER BY s.created_at DESC`,
      [userId]
    );

    res.json({ starredItems: starred });
  } catch (err: any) {
    console.error('Error fetching starred items:', err);
    res.status(500).json({ error: 'Failed to fetch starred messages.' });
  }
});

// Star a message
router.post('/:messageId', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const messageId = req.params.messageId;
    const userId = req.user!.id;
    const db = await getDb();

    // Verify message exists and belongs to a conversation owned by the user
    const msg = queryOne(
      db,
      `SELECT m.id FROM messages m
       JOIN conversations c ON m.conversation_id = c.id
       WHERE m.id = ? AND c.user_id = ?`,
      [messageId, userId]
    );

    if (!msg) {
      res.status(404).json({ error: 'Message not found or does not belong to your account.' });
      return;
    }

    // Check if already starred
    const existing = queryOne(
      db,
      'SELECT id FROM starred_items WHERE user_id = ? AND message_id = ?',
      [userId, messageId]
    );

    if (existing) {
      res.json({ message: 'Message is already starred.', starId: existing.id });
      return;
    }

    const starId = crypto.randomUUID();
    const now = new Date().toISOString();

    execute(
      db,
      'INSERT INTO starred_items (id, user_id, message_id, created_at) VALUES (?, ?, ?, ?)',
      [starId, userId, messageId, now]
    );

    saveDbSync();
    res.status(201).json({ message: 'Message starred successfully.', starId });
  } catch (err: any) {
    console.error('Error starring message:', err);
    res.status(500).json({ error: 'Failed to star message.' });
  }
});

// Unstar a message
router.delete('/:messageId', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const messageId = req.params.messageId;
    const userId = req.user!.id;
    const db = await getDb();

    execute(
      db,
      'DELETE FROM starred_items WHERE user_id = ? AND message_id = ?',
      [userId, messageId]
    );

    saveDbSync();
    res.json({ message: 'Message unstarred successfully.' });
  } catch (err: any) {
    console.error('Error unstarring message:', err);
    res.status(500).json({ error: 'Failed to unstar message.' });
  }
});

export default router;
