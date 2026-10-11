import express from 'express';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import authRoutes from './server/routes/authRoutes.ts';
import chatRoutes from './server/routes/chatRoutes.ts';
import starredRoutes from './server/routes/starredRoutes.ts';
import imageRoutes from './server/routes/imageRoutes.ts';
import translateRoutes from './server/routes/translateRoutes.ts';
import voiceRoutes from './server/routes/voiceRoutes.ts';
import memoryRoutes from './server/routes/memoryRoutes.ts';
import preferencesRoutes from './server/routes/preferencesRoutes.ts';
import documentRoutes from './server/routes/documentRoutes.ts';
import { getDb } from './server/db.ts';

dotenv.config();

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const isProduction = process.env.NODE_ENV === 'production';

// Body parsers with 25MB limit for attachments & documents
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// Static file serving for generated images
const IMAGES_DIR = path.resolve(process.cwd(), 'data', 'uploads', 'images');
if (!fs.existsSync(IMAGES_DIR)) fs.mkdirSync(IMAGES_DIR, { recursive: true });
app.use('/api/storage/images', express.static(IMAGES_DIR));

// Health check
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'NOVA AI Platform',
    geminiConfigured: Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY'),
    timestamp: new Date().toISOString(),
  });
});

// Mount modular API routers
app.use('/api/auth', authRoutes);
app.use('/api/conversations', chatRoutes);
app.use('/api/starred', starredRoutes);
app.use('/api/images', imageRoutes);
app.use('/api/translate', translateRoutes);
app.use('/api/voice', voiceRoutes);
app.use('/api/memories', memoryRoutes);
app.use('/api/preferences', preferencesRoutes);
app.use('/api/documents', documentRoutes);

async function startServer() {
  // Initialize SQLite database
  await getDb();
  console.log('[NOVA AI] SQLite database initialized and ready.');

  if (!isProduction) {
    // Development mode: Mount Vite middleware
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
    console.log('[NOVA AI] Vite middleware mounted in dev mode.');
  } else {
    // Production mode: Serve dist folder
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
    console.log('[NOVA AI] Serving production build from /dist.');
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[NOVA AI] Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('[NOVA AI] Server startup error:', err);
  process.exit(1);
});
