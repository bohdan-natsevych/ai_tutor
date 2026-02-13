
import { Chat } from '@/stores/chatStore';

export function getDisplayTitle(chat: Chat | null | undefined, t: (key: string) => string): string {
  if (!chat) return t('common.conversation');

  // Check for default titles and translate them
  if (chat.title === 'General Conversation') return t('chat.defaultTitle.general');
  // Handle simple Roleplay/Topic default titles if they exactly match the English default
  if (chat.title === 'Roleplay') return t('chat.defaultTitle.roleplay');
  if (chat.title === 'Topic Discussion') return t('chat.defaultTitle.topic');

  // Current logic for dynamic titles (Roleplay: X) is harder to translate reliably 
  // without parsing, but strict matching covers the "Default" cases.
  // We could add regex parsing later if needed, but for "General Conversation" this is sufficient.
  
  return chat.title;
}
