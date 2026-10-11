import express, { Response } from 'express';
import crypto from 'crypto';
import { getDb, queryAll, queryOne, execute, saveDbSync } from '../db.ts';
import { requireAuth, AuthenticatedRequest } from '../auth.ts';

const router = express.Router();

// List all memories for user
router.get('/', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const db = await getDb();
    const userId = req.user!.id;

    const memories = queryAll(
      db,
      'SELECT id, memory_content, created_at, updated_at FROM user_memory WHERE user_id = ? ORDER BY updated_at DESC',
      [userId]
    );

    res.json({ memories });
  } catch (err: any) {
    console.error('Error fetching memories:', err);
    res.status(500).json({ error: 'Failed to fetch personal memories.' });
  }
});

// Add new memory
router.post('/', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { memory_content } = req.body;
    const userId = req.user!.id;

    if (!memory_content || !memory_content.trim()) {
      res.status(400).json({ error: 'Memory content cannot be empty.' });
      return;
    }

    const memoryId = crypto.randomUUID();
    const now = new Date().toISOString();
    const db = await getDb();

    execute(
      db,
      'INSERT INTO user_memory (id, user_id, memory_content, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
      [memoryId, userId, memory_content.trim(), now, now]
    );

    saveDbSync();

    res.status(201).json({
      memory: {
        id: memoryId,
        memory_content: memory_content.trim(),
        created_at: now,
        updated_at: now,
      },
      message: 'Memory saved to NOVA.',
    });
  } catch (err: any) {
    console.error('Error adding memory:', err);
    res.status(500).json({ error: 'Failed to save memory.' });
  }
});

// Update memory
router.put('/:id', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const memoryId = req.params.id;
    const { memory_content } = req.body;
    const userId = req.user!.id;

    if (!memory_content || !memory_content.trim()) {
      res.status(400).json({ error: 'Memory content cannot be empty.' });
      return;
    }

    const db = await getDb();
    const existing = queryOne(
      db,
      'SELECT id FROM user_memory WHERE id = ? AND user_id = ?',
      [memoryId, userId]
    );

    if (!existing) {
      res.status(404).json({ error: 'Memory not found.' });
      return;
    }

    const now = new Date().toISOString();
    execute(
      db,
      'UPDATE user_memory SET memory_content = ?, updated_at = ? WHERE id = ?',
      [memory_content.trim(), now, memoryId]
    );

    saveDbSync();

    res.json({
      memory: {
        id: memoryId,
        memory_content: memory_content.trim(),
        updated_at: now,
      },
      message: 'Memory updated successfully.',
    });
  } catch (err: any) {
    console.error('Error updating memory:', err);
    res.status(500).json({ error: 'Failed to update memory.' });
  }
});

// Delete specific memory
router.delete('/:id', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const memoryId = req.params.id;
    const userId = req.user!.id;
    const db = await getDb();

    execute(
      db,
      'DELETE FROM user_memory WHERE id = ? AND user_id = ?',
      [memoryId, userId]
    );

    saveDbSync();

    res.json({ message: 'Memory deleted.' });
  } catch (err: any) {
    console.error('Error deleting memory:', err);
    res.status(500).json({ error: 'Failed to delete memory.' });
  }
});

// Clear all memories
router.delete('/', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const db = await getDb();

    execute(db, 'DELETE FROM user_memory WHERE user_id = ?', [userId]);
    saveDbSync();

    res.json({ message: 'All memories cleared.' });
  } catch (err: any) {
    console.error('Error clearing memories:', err);
    res.status(500).json({ error: 'Failed to clear memories.' });
  }
});

export default router;
