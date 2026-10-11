import express, { Response } from 'express';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { getDb, queryAll, queryOne, execute, saveDbSync } from '../db.ts';
import { requireAuth, AuthenticatedRequest } from '../auth.ts';
import { generateImageWithGemini } from '../gemini.ts';

const router = express.Router();
const IMAGES_DIR = path.resolve(process.cwd(), 'data', 'uploads', 'images');

// List generated images for user
router.get('/', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const db = await getDb();
    const userId = req.user!.id;

    const images = queryAll(
      db,
      'SELECT id, prompt, image_reference, aspect_ratio, created_at, generation_status FROM generated_images WHERE user_id = ? ORDER BY created_at DESC',
      [userId]
    );

    res.json({ images });
  } catch (err: any) {
    console.error('Error fetching images:', err);
    res.status(500).json({ error: 'Failed to fetch generated images.' });
  }
});

// Generate new image
router.post('/generate', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { prompt, aspectRatio = '1:1', style = 'cinematic' } = req.body;
    const userId = req.user!.id;

    if (!prompt || !prompt.trim()) {
      res.status(400).json({ error: 'Please enter a description for the image.' });
      return;
    }

    const imageId = crypto.randomUUID();
    const now = new Date().toISOString();

    // Call Gemini API for image generation
    const { base64Image, mimeType } = await generateImageWithGemini({
      prompt: prompt.trim(),
      aspectRatio,
      style,
    });

    // Save image to disk storage
    const ext = mimeType.includes('jpeg') ? 'jpg' : 'png';
    const filename = `${imageId}.${ext}`;
    const filePath = path.join(IMAGES_DIR, filename);
    const buffer = Buffer.from(base64Image, 'base64');
    fs.writeFileSync(filePath, buffer);

    const imageReference = `/api/storage/images/${filename}`;

    const db = await getDb();
    execute(
      db,
      'INSERT INTO generated_images (id, user_id, prompt, image_reference, aspect_ratio, created_at, generation_status) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [imageId, userId, prompt.trim(), imageReference, aspectRatio, now, 'completed']
    );

    saveDbSync();

    res.status(201).json({
      image: {
        id: imageId,
        prompt: prompt.trim(),
        image_reference: imageReference,
        aspect_ratio: aspectRatio,
        created_at: now,
        generation_status: 'completed',
        base64Preview: `data:${mimeType};base64,${base64Image}`,
      },
    });
  } catch (err: any) {
    console.error('Image generation error:', err);
    res.status(500).json({
      error: err.message || 'Image generation failed. Ensure GEMINI_API_KEY is configured with appropriate capabilities.',
    });
  }
});

// Delete generated image
router.delete('/:id', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const imageId = req.params.id;
    const userId = req.user!.id;
    const db = await getDb();

    const img = queryOne(
      db,
      'SELECT id, image_reference FROM generated_images WHERE id = ? AND user_id = ?',
      [imageId, userId]
    );

    if (!img) {
      res.status(404).json({ error: 'Image not found.' });
      return;
    }

    // Try to remove file from disk
    try {
      const filename = path.basename(img.image_reference);
      const filePath = path.join(IMAGES_DIR, filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (e) {
      console.warn('Could not remove file on disk:', e);
    }

    execute(db, 'DELETE FROM generated_images WHERE id = ? AND user_id = ?', [imageId, userId]);
    saveDbSync();

    res.json({ message: 'Image deleted successfully.' });
  } catch (err: any) {
    console.error('Error deleting image:', err);
    res.status(500).json({ error: 'Failed to delete image.' });
  }
});

export default router;
