import { drizzle as drizzleSqlite } from 'drizzle-orm/better-sqlite3';
import { drizzle as drizzlePostgres } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import Database from 'better-sqlite3';
import * as schemaSqlite from './schema';
import * as schemaPostgres from './schema.postgres';
import path from 'path';
import fs from 'fs';

// Lazy initialization - only create DB when accessed
let _db: any = null;
let _schema: any = null;
let _initialized = false;

function initializeDatabase() {
  if (_initialized) {
    return;
  }

  _initialized = true;

  // Detect database type from DATABASE_URL
  const databaseUrl = process.env.DATABASE_URL;
  const isPostgres = databaseUrl?.startsWith('postgres');

  if (isPostgres && databaseUrl) {
    // PostgreSQL setup for production (Vercel/Neon)
    const sql = neon(databaseUrl);
    _db = drizzlePostgres(sql, { schema: schemaPostgres });
    _schema = schemaPostgres;
    
    console.log('📊 Using PostgreSQL database');
  } else {
    // SQLite setup for local development only (not during build)
    // Skip initialization if we're in a build environment without proper filesystem
    if (typeof window === 'undefined' && process.env.NEXT_PHASE === 'phase-production-build') {
      console.log('⚠️ Skipping SQLite initialization during build');
      return;
    }

    // Ensure data directory exists
    const dataDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    // Database path
    const dbPath = databaseUrl?.replace('file:', '') || path.join(dataDir, 'lanqua.db');

    // Create SQLite connection
    const sqlite = new Database(dbPath);

    // Enable foreign keys
    sqlite.pragma('foreign_keys = ON');

    // CURSOR: Create tables if they don't exist
    // This ensures the database is ready on first run without needing migrations
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS chats (
        id TEXT PRIMARY KEY,
        title TEXT,
        topic_type TEXT DEFAULT 'general',
        topic_details TEXT,
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
    `);

    // CURSOR: Ensure new columns exist for existing databases
    const messageColumns = sqlite.prepare(`PRAGMA table_info(messages);`).all();
    const messageColumnNames = new Set((messageColumns as Array<{ name: string }>).map((col) => col.name));
    if (!messageColumnNames.has('audio_blob')) {
      sqlite.exec(`ALTER TABLE messages ADD COLUMN audio_blob BLOB;`);
    }
    if (!messageColumnNames.has('audio_format')) {
      sqlite.exec(`ALTER TABLE messages ADD COLUMN audio_format TEXT;`);
    }

    // Create Drizzle instance
    _db = drizzleSqlite(sqlite, { schema: schemaSqlite });
    _schema = schemaSqlite;
    
    console.log('📊 Using SQLite database');
  }
}

// Export getter that initializes on first access
export const db = new Proxy({} as any, {
  get(target, prop) {
    initializeDatabase();
    if (_db === null) {
      throw new Error('Database not initialized. Make sure DATABASE_URL is set for production.');
    }
    return _db[prop];
  }
});

// Export schema for convenience
export * from './schema';
