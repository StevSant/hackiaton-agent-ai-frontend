import type { ChatEntry } from '../models/playground-models';
import type { ChatMessage } from '../models/chat-model';

export function adaptChatEntriesToMessages(
  entries: ChatEntry[],
): ChatMessage[] {
  const messages: ChatMessage[] = [];
  const sorted = [...entries].sort(
    (a, b) => a.message.created_at - b.message.created_at,
  );
  for (const entry of sorted) {
    // user message
    messages.push({
      id: `user-${entry.message.created_at}`,
      content: entry.message.content,
      displayedContent: entry.message.content,
      isComplete: true,
      isStreaming: false,
      event: 'UserMessage',
      timestamp: entry.message.created_at * 1000,
    });
    // agent response
    messages.push({
      id: `agent-${entry.response.created_at}`,
      content: entry.response.content,
      displayedContent: entry.response.content,
      isComplete: true,
      isStreaming: false,
      event: 'RunCompleted',
      timestamp: entry.response.created_at * 1000,
      extra_data: entry.response.extra_data,
      images: entry.response.images,
      videos: entry.response.videos,
      audio: entry.response.audio,
      response_audio: entry.response.response_audio,
    } as ChatMessage);
  }
  return messages;
}
