export type EventType =
  | 'UserMessage'
  | 'RunResponse'
  | 'RunStarted'
  | 'RunCompleted'
  | 'RunError'
  | 'UpdatingMemory'
  | 'ToolCallStarted'
  | 'Error'
  | 'Cancelled';

export type ContentType = 'text' | 'str';

export interface BaseAgentEvent {
  content: string;
  agent_id: string;
  event: EventType;
  run_id: string;
  session_id: string;
  created_at: number;
  content_type: ContentType;
}

export interface ChatMessage {
  id: string;
  content: string;
  displayedContent: string;
  isComplete: boolean;
  isStreaming: boolean;
  event: EventType;
  timestamp: number;
  // Associated uploaded file ids for this message (user message mostly)
  file_ids?: string[];
  // Enriched fields from streaming
  extra_data?: {
    reasoning_steps?: Array<{
      title: string;
      action?: string;
      result: string;
      reasoning: string;
      confidence?: number;
      next_action?: string;
    }>;
    references?: Array<{
      query: string;
      references: Array<{
        content: string;
        meta_data: { chunk: number; chunk_size: number };
        name: string;
      }>;
      time?: number;
    }>;
  };
  images?: Array<{ revised_prompt: string; url: string }>;
  videos?: Array<{ id: number; eta: number; url: string }>;
  audio?: Array<{
    base64_audio?: string;
    mime_type?: string;
    url?: string;
    id?: string;
    content?: string;
    channels?: number;
    sample_rate?: number;
  }>;
  response_audio?: {
    id?: string;
    content?: string;
    transcript?: string;
    channels?: number;
    sample_rate?: number;
  };
}
