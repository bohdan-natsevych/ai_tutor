import { pgTable, text, timestamp } from 'drizzle-orm/pg-core';

// Users table
export const users = pgTable('users', {
  id: text('id').primaryKey(),
  name: text('name').notNull().unique(),
  passwordHash: text('password_hash').notNull().default(''),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
});

// Chats table
export const chats = pgTable('chats', {
  id: text('id').primaryKey(),
  userId: text('user_id').references(() => users.id),
  title: text('title'),
  topicType: text('topic_type').$type<'general' | 'roleplay' | 'topic' | 'dictionary'>().default('general'),
  topicDetails: text('topic_details'), // JSON string
  level: text('level').$type<'novice' | 'beginner' | 'intermediate' | 'advanced'>().default('intermediate'),
  language: text('language').default('en'),
  dialect: text('dialect').default('american'),
  threadId: text('thread_id'), // OpenAI Assistants API thread ID
  aiProvider: text('ai_provider').default('openai'),
  aiMode: text('ai_mode').$type<'chat' | 'assistant'>().default('chat'),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow().notNull(),
});

// Messages table
export const messages = pgTable('messages', {
  id: text('id').primaryKey(),
  chatId: text('chat_id').references(() => chats.id, { onDelete: 'cascade' }),
  role: text('role').$type<'user' | 'assistant'>().notNull(),
  content: text('content').notNull(),
  audioUrl: text('audio_url'), // Cached audio blob URL
  audioBlob: text('audio_blob'), // Store as base64 text for compatibility
  audioFormat: text('audio_format'),
  analysis: text('analysis'), // JSON string with analysis data
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
});

// Settings table (key-value store)
export const settings = pgTable('settings', {
  key: text('key').primaryKey(),
  value: text('value'), // JSON value
});

// Dictionaries table
export const dictionaries = pgTable('dictionaries', {
  id: text('id').primaryKey(),
  userId: text('user_id').references(() => users.id),
  name: text('name').notNull(),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
});

// Vocabulary table
export const vocabulary = pgTable('vocabulary', {
  id: text('id').primaryKey(),
  userId: text('user_id').references(() => users.id),
  dictionaryId: text('dictionary_id').references(() => dictionaries.id, { onDelete: 'cascade' }),
  word: text('word').notNull(),
  translation: text('translation'),
  example: text('example'),
  context: text('context'), // From which chat
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
});

// Chat summaries table (for context management)
export const chatSummaries = pgTable('chat_summaries', {
  chatId: text('chat_id').primaryKey().references(() => chats.id, { onDelete: 'cascade' }),
  content: text('content'), // The summary text
  lastMessageIndex: text('last_message_index'), // Changed from integer to text for compatibility
  updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow().notNull(),
});

// Type exports
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Chat = typeof chats.$inferSelect;
export type NewChat = typeof chats.$inferInsert;
export type Message = typeof messages.$inferSelect;
export type NewMessage = typeof messages.$inferInsert;
export type Setting = typeof settings.$inferSelect;
export type Dictionary = typeof dictionaries.$inferSelect;
export type NewDictionary = typeof dictionaries.$inferInsert;
export type Vocabulary = typeof vocabulary.$inferSelect;
export type NewVocabulary = typeof vocabulary.$inferInsert;
export type ChatSummary = typeof chatSummaries.$inferSelect;
