import { eq, desc, asc, and } from 'drizzle-orm';
import { db, chats, messages, settings, vocabulary, chatSummaries, users } from './index';
import type { NewChat, NewMessage, NewVocabulary, Chat, Message, User } from './schema';
import { v4 as uuidv4 } from 'uuid';

// ============= USER OPERATIONS =============

export async function createUser(data: { name: string; passwordHash: string }): Promise<User> {
  const id = uuidv4();
  const now = new Date();

  await db.insert(users).values({
    id,
    name: data.name,
    passwordHash: data.passwordHash,
    createdAt: now,
  });

  const [user] = await db.select().from(users).where(eq(users.id, id));
  return user;
}

export async function getUserByName(name: string): Promise<User | undefined> {
  const [user] = await db.select().from(users).where(eq(users.name, name));
  return user;
}

export async function getUserById(id: string): Promise<User | undefined> {
  const [user] = await db.select().from(users).where(eq(users.id, id));
  return user;
}

// ============= CHAT OPERATIONS =============

export async function createChat(data: Omit<NewChat, 'id' | 'createdAt' | 'updatedAt'>, existingId?: string): Promise<Chat> {
  const id = existingId || uuidv4();
  const now = new Date();
  
  await db.insert(chats).values({
    id,
    ...data,
    createdAt: now,
    updatedAt: now,
  });
  
  const [chat] = await db.select().from(chats).where(eq(chats.id, id));
  return chat;
}

export async function getChat(id: string): Promise<Chat | undefined> {
  const [chat] = await db.select().from(chats).where(eq(chats.id, id));
  return chat;
}

export async function getAllChats(userId: string): Promise<Chat[]> {
  return await db.select().from(chats)
    .where(eq(chats.userId, userId))
    .orderBy(desc(chats.updatedAt));
}

export async function updateChat(id: string, data: Partial<NewChat>): Promise<void> {
  await db.update(chats)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(chats.id, id));
}

export async function deleteChat(id: string): Promise<void> {
  await db.delete(chats).where(eq(chats.id, id));
}

// ============= MESSAGE OPERATIONS =============

export async function createMessage(data: Omit<NewMessage, 'id' | 'createdAt'>, existingId?: string): Promise<Message> {
  const id = existingId || uuidv4();
  const now = new Date();
  
  await db.insert(messages).values({
    id,
    ...data,
    createdAt: now,
  });
  
  // Update chat's updatedAt
  if (data.chatId) {
    await db.update(chats)
      .set({ updatedAt: now })
      .where(eq(chats.id, data.chatId));
  }
  
  const [message] = await db.select().from(messages).where(eq(messages.id, id));
  return message;
}

export async function getMessage(id: string): Promise<Message | undefined> {
  const [message] = await db.select().from(messages).where(eq(messages.id, id));
  return message;
}

export async function getChatMessages(chatId: string): Promise<Message[]> {
  return await db.select()
    .from(messages)
    .where(eq(messages.chatId, chatId))
    .orderBy(asc(messages.createdAt));
}

export async function updateMessage(id: string, data: Partial<NewMessage>): Promise<void> {
  await db.update(messages).set(data).where(eq(messages.id, id));
}

export async function deleteMessage(id: string): Promise<void> {
  await db.delete(messages).where(eq(messages.id, id));
}

// ============= SETTINGS OPERATIONS =============

export async function getSetting<T>(key: string): Promise<T | null> {
  const [setting] = await db.select().from(settings).where(eq(settings.key, key));
  if (!setting?.value) return null;
  
  try {
    return JSON.parse(setting.value) as T;
  } catch {
    return setting.value as unknown as T;
  }
}

export async function setSetting<T>(key: string, value: T): Promise<void> {
  const jsonValue = JSON.stringify(value);
  
  await db.insert(settings)
    .values({ key, value: jsonValue })
    .onConflictDoUpdate({
      target: settings.key,
      set: { value: jsonValue },
    });
}

export async function getAllSettings(): Promise<Record<string, unknown>> {
  const allSettings = await db.select().from(settings);
  const result: Record<string, unknown> = {};
  
  for (const setting of allSettings) {
    if (setting.value) {
      try {
        result[setting.key] = JSON.parse(setting.value);
      } catch {
        result[setting.key] = setting.value;
      }
    }
  }
  
  return result;
}

// ============= VOCABULARY OPERATIONS =============

export async function addVocabulary(data: Omit<NewVocabulary, 'id' | 'createdAt'>) {
  const id = uuidv4();
  
  await db.insert(vocabulary).values({
    id,
    ...data,
    createdAt: new Date(),
  });
  
  const [entry] = await db.select().from(vocabulary).where(eq(vocabulary.id, id));
  return entry;
}

export async function getAllVocabulary(userId: string) {
  return await db.select().from(vocabulary)
    .where(eq(vocabulary.userId, userId))
    .orderBy(desc(vocabulary.createdAt));
}

export async function deleteVocabulary(id: string): Promise<void> {
  await db.delete(vocabulary).where(eq(vocabulary.id, id));
}

// ============= CHAT SUMMARY OPERATIONS =============

export async function getChatSummary(chatId: string) {
  const [summary] = await db.select().from(chatSummaries).where(eq(chatSummaries.chatId, chatId));
  return summary;
}

export async function updateChatSummary(chatId: string, data: { content: string; lastMessageIndex: number }): Promise<void> {
  await db.insert(chatSummaries)
    .values({
      chatId,
      content: data.content,
      lastMessageIndex: data.lastMessageIndex,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: chatSummaries.chatId,
      set: {
        content: data.content,
        lastMessageIndex: data.lastMessageIndex,
        updatedAt: new Date(),
      },
    });
}
