import { sqliteTable, text, integer, blob } from 'drizzle-orm/sqlite-core';

// Users table
export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  name: text('name').notNull().unique(),
  passwordHash: text('password_hash').notNull().default(''),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

// Chats table
export const chats = sqliteTable('chats', {
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
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

// Messages table
export const messages = sqliteTable('messages', {
  id: text('id').primaryKey(),
  chatId: text('chat_id').references(() => chats.id, { onDelete: 'cascade' }),
  role: text('role').$type<'user' | 'assistant'>().notNull(),
  content: text('content').notNull(),
  audioUrl: text('audio_url'), // Cached audio blob URL
  audioBlob: blob('audio_blob', { mode: 'buffer' }),
  audioFormat: text('audio_format'),
  analysis: text('analysis'), // JSON string with analysis data
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

// Settings table (key-value store)
export const settings = sqliteTable('settings', {
  key: text('key').primaryKey(),
  value: text('value'), // JSON value
});

// Dictionaries table
export const dictionaries = sqliteTable('dictionaries', {
  id: text('id').primaryKey(),
  userId: text('user_id').references(() => users.id),
  name: text('name').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

// Vocabulary table
export const vocabulary = sqliteTable('vocabulary', {
  id: text('id').primaryKey(),
  userId: text('user_id').references(() => users.id),
  dictionaryId: text('dictionary_id').references(() => dictionaries.id, { onDelete: 'cascade' }),
  word: text('word').notNull(),
  translation: text('translation'),
  example: text('example'),
  context: text('context'), // From which chat
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

// Chat summaries table (for context management)
export const chatSummaries = sqliteTable('chat_summaries', {
  chatId: text('chat_id').primaryKey().references(() => chats.id, { onDelete: 'cascade' }),
  content: text('content'), // The summary text
  lastMessageIndex: integer('last_message_index'), // Index of last summarized message
  updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
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
