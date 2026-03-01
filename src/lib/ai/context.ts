import { getChatMessages, getChatSummary, updateChatSummary } from '../db/queries';
import type { ChatMessage, ConversationContext } from './types';
import type { Message } from '../db/schema';
import { aiManager } from './manager';

// Context Settings Type
export interface ContextSettings {
  recentWindowSize: number; // Messages kept in full (default: 20)
  summarizeAfterMessages: number; // Trigger summarization every N messages (default: 10)
  textModel?: string; // Text model for summarization (from user settings)
  disableSummarization: boolean;
}

// Default context settings
export const DEFAULT_CONTEXT_SETTINGS: ContextSettings = {
  recentWindowSize: 20,
  summarizeAfterMessages: 10,
  disableSummarization: false,
};

// Context Manager - Handles sliding window and summarization
class ContextManager {
  private settings: ContextSettings = DEFAULT_CONTEXT_SETTINGS;

  // Update settings
  setSettings(newSettings: Partial<ContextSettings>): void {
    this.settings = { ...this.settings, ...newSettings };
  }

  // Get current settings
  getSettings(): ContextSettings {
    return { ...this.settings };
  }

  // Build conversation context for AI
  async buildContext(
    chatId: string,
    systemPrompt: string,
    threadId?: string
  ): Promise<ConversationContext> {
    const allMessages = await getChatMessages(chatId);
    
    // If summarization is disabled or few messages, return full history
    if (this.settings.disableSummarization || allMessages.length <= this.settings.recentWindowSize) {
      return {
        chatId,
        threadId,
        messages: this.formatMessages(allMessages),
        systemPrompt,
      };
    }

    // Split: older messages (to summarize) vs recent (keep full)
    const splitIndex = allMessages.length - this.settings.recentWindowSize;
    const olderMessages = allMessages.slice(0, splitIndex);
    const recentMessages = allMessages.slice(splitIndex);

    // Get or create summary for older messages
    const summary = await this.getOrCreateSummary(chatId, olderMessages);

    return {
      chatId,
      threadId,
      messages: this.formatMessages(recentMessages),
      systemPrompt,
      summary,
    };
  }

  // Get existing summary or create a new one
  private async getOrCreateSummary(chatId: string, messages: Message[]): Promise<string> {
    const existingSummary = await getChatSummary(chatId);
    const lastSummarizedIndex = existingSummary?.lastMessageIndex ?? 0;

    // Check if we need to update summary
    const unsummarizedMessages = messages.slice(lastSummarizedIndex);
    
    if (unsummarizedMessages.length < this.settings.summarizeAfterMessages) {
      return existingSummary?.content ?? '';
    }

    // Summarize new messages
    const newSummaryChunk = await this.summarize(unsummarizedMessages);

    // Merge with existing summary
    const mergedSummary = existingSummary?.content
      ? await this.mergeSummaries(existingSummary.content, newSummaryChunk)
      : newSummaryChunk;

    // Store updated summary
    await updateChatSummary(chatId, {
      content: mergedSummary,
      lastMessageIndex: messages.length,
    });

    return mergedSummary;
  }

  // Summarize a batch of messages
  private async summarize(messages: Message[]): Promise<string> {
    const prompt = `Summarize this conversation segment concisely, preserving:
- Key topics discussed
- Important decisions or preferences expressed
- User's language patterns and common mistakes
- Any roleplay context or scenario details
- Names and relationships mentioned

CONVERSATION:
${messages.map(m => `${m.role}: ${m.content}`).join('\n')}

SUMMARY:`;

    try {
      const response = await aiManager.generateText(
        {
          chatId: '',
          messages: [],
          systemPrompt: 'You are a summarization assistant. Create concise, informative summaries.',
        },
        prompt,
        { temperature: 0.3, maxTokens: 500, model: this.settings.textModel }
      );

      return response.content;
    } catch (error) {
      console.error('Summarization failed:', error);
      // Return a simple fallback summary
      return `[Previous conversation with ${messages.length} messages]`;
    }
  }

  // Merge two summaries into one
  private async mergeSummaries(existingSummary: string, newSummary: string): Promise<string> {
    const prompt = `Merge these two conversation summaries into a single, coherent summary. Keep it concise but complete.

EARLIER SUMMARY:
${existingSummary}

NEW EVENTS:
${newSummary}

MERGED SUMMARY:`;

    try {
      const response = await aiManager.generateText(
        {
          chatId: '',
          messages: [],
          systemPrompt: 'You are a summarization assistant. Merge summaries coherently.',
        },
        prompt,
        { temperature: 0.3, maxTokens: 500, model: this.settings.textModel }
      );

      return response.content;
    } catch (error) {
      console.error('Summary merge failed:', error);
      // Return concatenated summaries as fallback
      return `${existingSummary}\n\n${newSummary}`;
    }
  }

  // Format database messages to chat format
  private formatMessages(messages: Message[]): ChatMessage[] {
    return messages.map(m => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }));
  }

  // Estimate token count (rough approximation)
  estimateTokens(context: ConversationContext): number {
    const systemTokens = Math.ceil(context.systemPrompt.length / 4);
    const summaryTokens = context.summary ? Math.ceil(context.summary.length / 4) : 0;
    const messageTokens = context.messages.reduce(
      (sum, m) => sum + Math.ceil(m.content.length / 4),
      0
    );
    return systemTokens + summaryTokens + messageTokens;
  }
}

// Export singleton instance
export const contextManager = new ContextManager();
