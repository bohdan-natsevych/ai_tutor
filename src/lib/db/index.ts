import { drizzle as drizzleSqlite } from 'drizzle-orm/better-sqlite3';
import { drizzle as drizzlePostgres } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import Database from 'better-sqlite3';
import * as schemaSqlite from './schema';
import * as schemaPostgres from './schema.postgres';
import path from 'path';
import fs from 'fs';

// Detect database type at module load from DATABASE_URL
const _isPostgres = process.env.DATABASE_URL?.startsWith('postgres') ?? false;

// Pick the correct schema tables at module load (no Proxy, no conditional export)
const activeSchema = _isPostgres ? schemaPostgres : schemaSqlite;
export const chats = activeSchema.chats as any;
export const messages = activeSchema.messages as any;
export const settings = activeSchema.settings as any;
export const dictionaries = activeSchema.dictionaries as any;
export const vocabulary = activeSchema.vocabulary as any;
export const chatSummaries = activeSchema.chatSummaries as any;
export const users = activeSchema.users as any;

// Re-export types (compatible between both schemas)
export type { Chat, NewChat, Message, NewMessage, Setting, Dictionary, NewDictionary, Vocabulary, NewVocabulary, ChatSummary, User, NewUser } from './schema';

// Lazy initialization - only create DB connection when accessed
let _db: any = null;
let _initialized = false;

function initializeDatabase() {
  if (_initialized) return;
  _initialized = true;

  const databaseUrl = process.env.DATABASE_URL;

  if (_isPostgres && databaseUrl) {
    // PostgreSQL setup for production (Vercel/Neon)
    const sql = neon(databaseUrl);
    _db = drizzlePostgres(sql, { schema: schemaPostgres });

    // CURSOR: Ensure new columns exist for existing Postgres databases
    sql(`ALTER TABLE chats ADD COLUMN IF NOT EXISTS level TEXT DEFAULT 'intermediate'`).catch(() => {});
    sql(`CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, name TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL DEFAULT '', created_at TIMESTAMP DEFAULT NOW())`).catch(() => {});
    sql(`ALTER TABLE chats ADD COLUMN IF NOT EXISTS user_id TEXT REFERENCES users(id)`).catch(() => {});
    sql(`ALTER TABLE vocabulary ADD COLUMN IF NOT EXISTS user_id TEXT REFERENCES users(id)`).catch(() => {});
    sql(`CREATE TABLE IF NOT EXISTS dictionaries (id TEXT PRIMARY KEY, user_id TEXT REFERENCES users(id), name TEXT NOT NULL, created_at TIMESTAMP DEFAULT NOW())`).catch(() => {});
    sql(`ALTER TABLE vocabulary ADD COLUMN IF NOT EXISTS dictionary_id TEXT REFERENCES dictionaries(id) ON DELETE CASCADE`).catch(() => {});

    console.log('Using PostgreSQL database');
  } else {
    // SQLite setup for local development only (not during build)
    if (process.env.NEXT_PHASE === 'phase-production-build') {
      console.log('Skipping SQLite initialization during build');
      return;
    }

    // Ensure data directory exists
    const dataDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    // Database path
    const dbPath = databaseUrl?.replace('file:', '') || path.join(dataDir, 'ai-tutor.db');

    // Create SQLite connection
    const sqlite = new Database(dbPath);
    sqlite.pragma('foreign_keys = ON');

    // Create tables if they don't exist
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS chats (
        id TEXT PRIMARY KEY,
        title TEXT,
        topic_type TEXT DEFAULT 'general',
        topic_details TEXT,
        level TEXT DEFAULT 'intermediate',
        language TEXT DEFAULT 'en',
        dialect TEXT DEFAULT 'american',
        thread_id TEXT,
        ai_provider TEXT DEFAULT 'openai',
        ai_mode TEXT DEFAULT 'chat',
        created_at INTEGER,
        updated_at INTEGER
      );

      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        chat_id TEXT REFERENCES chats(id) ON DELETE CASCADE,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        audio_url TEXT,
        audio_blob BLOB,
        audio_format TEXT,
        analysis TEXT,
        created_at INTEGER
      );

      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT
      );

      CREATE TABLE IF NOT EXISTS vocabulary (
        id TEXT PRIMARY KEY,
        word TEXT NOT NULL,
        translation TEXT,
        example TEXT,
        context TEXT,
        created_at INTEGER
      );

      CREATE TABLE IF NOT EXISTS chat_summaries (
        chat_id TEXT PRIMARY KEY REFERENCES chats(id) ON DELETE CASCADE,
        content TEXT,
        last_message_index INTEGER,
        updated_at INTEGER
      );

      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL DEFAULT '',
        created_at INTEGER
      );

      CREATE TABLE IF NOT EXISTS dictionaries (
        id TEXT PRIMARY KEY,
        user_id TEXT REFERENCES users(id),
        name TEXT NOT NULL,
        created_at INTEGER
      );
    `);

    // Ensure new columns exist for existing databases
    const chatColumns = sqlite.prepare(`PRAGMA table_info(chats);`).all();
    const chatColumnNames = new Set((chatColumns as Array<{ name: string }>).map((col) => col.name));
    if (!chatColumnNames.has('level')) {
      sqlite.exec(`ALTER TABLE chats ADD COLUMN level TEXT DEFAULT 'intermediate';`);
    }

    const messageColumns = sqlite.prepare(`PRAGMA table_info(messages);`).all();
    const messageColumnNames = new Set((messageColumns as Array<{ name: string }>).map((col) => col.name));
    if (!messageColumnNames.has('audio_blob')) {
      sqlite.exec(`ALTER TABLE messages ADD COLUMN audio_blob BLOB;`);
    }
    if (!messageColumnNames.has('audio_format')) {
      sqlite.exec(`ALTER TABLE messages ADD COLUMN audio_format TEXT;`);
    }

    // Add user_id columns
    if (!chatColumnNames.has('user_id')) {
      sqlite.exec(`ALTER TABLE chats ADD COLUMN user_id TEXT REFERENCES users(id);`);
    }
    const vocabColumns = sqlite.prepare(`PRAGMA table_info(vocabulary);`).all();
    const vocabColumnNames = new Set((vocabColumns as Array<{ name: string }>).map((col) => col.name));
    if (!vocabColumnNames.has('user_id')) {
      sqlite.exec(`ALTER TABLE vocabulary ADD COLUMN user_id TEXT REFERENCES users(id);`);
    }
    if (!vocabColumnNames.has('dictionary_id')) {
      sqlite.exec(`ALTER TABLE vocabulary ADD COLUMN dictionary_id TEXT REFERENCES dictionaries(id) ON DELETE CASCADE;`);
    }

    _db = drizzleSqlite(sqlite, { schema: schemaSqlite });
    console.log('📊 Using SQLite database');
  }
}

// Export db as lazy getter - only connects when first accessed
export const db = new Proxy({} as any, {
  get(target, prop) {
    initializeDatabase();
    if (_db === null) {
      throw new Error('Database not initialized. Make sure DATABASE_URL is set for production.');
    }
    return _db[prop];
  }
});
