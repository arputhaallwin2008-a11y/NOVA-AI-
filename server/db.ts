import initSqlJs, { Database as SqlDatabase } from 'sql.js';
import fs from 'fs';
import path from 'path';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_PATH = path.join(DATA_DIR, 'nova.sqlite');
const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');
const IMAGES_DIR = path.join(UPLOADS_DIR, 'images');
const DOCS_DIR = path.join(UPLOADS_DIR, 'docs');

// Ensure data directories exist
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
if (!fs.existsSync(IMAGES_DIR)) fs.mkdirSync(IMAGES_DIR, { recursive: true });
if (!fs.existsSync(DOCS_DIR)) fs.mkdirSync(DOCS_DIR, { recursive: true });

let dbInstance: SqlDatabase | null = null;
let saveTimeout: NodeJS.Timeout | null = null;

export async function getDb(): Promise<SqlDatabase> {
  if (dbInstance) return dbInstance;

  const SQL = await initSqlJs();
  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    dbInstance = new SQL.Database(fileBuffer);
  } else {
    dbInstance = new SQL.Database();
  }

  initSchema(dbInstance);
  saveDb();
  return dbInstance;
}

export function saveDb() {
  if (!dbInstance) return;
  if (saveTimeout) clearTimeout(saveTimeout);
  
  saveTimeout = setTimeout(() => {
    try {
      if (!dbInstance) return;
      const data = dbInstance.export();
      const buffer = Buffer.from(data);
      fs.writeFileSync(DB_PATH, buffer);
    } catch (err) {
      console.error('Failed to save SQLite database:', err);
    }
  }, 100);
}

// Force immediate flush to disk
export function saveDbSync() {
  if (!dbInstance) return;
  try {
    const data = dbInstance.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_PATH, buffer);
  } catch (err) {
    console.error('Failed to immediately save SQLite database:', err);
  }
}

function initSchema(db: SqlDatabase) {
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      display_name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      avatar_url TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS conversations (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      archived_at TEXT,
      system_prompt TEXT,
      model_name TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      conversation_id TEXT NOT NULL,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at TEXT NOT NULL,
      model_name TEXT,
      status TEXT NOT NULL DEFAULT 'completed',
      grounding_data TEXT,
      file_attachments TEXT,
      FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS starred_items (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      message_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      UNIQUE(user_id, message_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS generated_images (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      prompt TEXT NOT NULL,
      image_reference TEXT NOT NULL,
      aspect_ratio TEXT DEFAULT '1:1',
      created_at TEXT NOT NULL,
      generation_status TEXT NOT NULL DEFAULT 'completed',
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS user_preferences (
      user_id TEXT PRIMARY KEY,
      theme TEXT DEFAULT 'dark',
      preferred_language TEXT DEFAULT 'en',
      voice_enabled INTEGER DEFAULT 1,
      voice_name TEXT DEFAULT 'Zephyr',
      system_prompt TEXT,
      web_search_enabled INTEGER DEFAULT 1,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS user_memory (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      memory_content TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_conversations_user ON conversations(user_id, updated_at DESC);
    CREATE INDEX IF NOT EXISTS idx_messages_conv ON messages(conversation_id, created_at ASC);
    CREATE INDEX IF NOT EXISTS idx_starred_user ON starred_items(user_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_images_user ON generated_images(user_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_memory_user ON user_memory(user_id, updated_at DESC);
  `);
}

// Helper query wrappers for sql.js
export function queryAll<T = any>(db: SqlDatabase, sql: string, params: any[] = []): T[] {
  const stmt = db.prepare(sql);
  try {
    stmt.bind(params);
    const results: T[] = [];
    while (stmt.step()) {
      results.push(stmt.getAsObject() as T);
    }
    return results;
  } finally {
    stmt.free();
  }
}

export function queryOne<T = any>(db: SqlDatabase, sql: string, params: any[] = []): T | null {
  const all = queryAll<T>(db, sql, params);
  return all.length > 0 ? all[0] : null;
}

export function execute(db: SqlDatabase, sql: string, params: any[] = []): void {
  db.run(sql, params);
  saveDb();
}
