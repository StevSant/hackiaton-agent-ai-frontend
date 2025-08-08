export interface SSEMessageModel {
  content: string;
  content_type: string;
  event: string;
  run_id: string;
  agent_id: string;
  session_id: string;
  created_at: number;
  model?: string;
  messages?: any[];
  metrics?: any;
  failed_generation?: any;
  extra_data?: any;
  images?: any[];
  videos?: any[];
  audio?: any[];
  response_audio?: any;
}

export interface StreamResponseModel {
  fullContent: string;
  currentChunk: string;
  event: string;
  isComplete: boolean;
  isError: boolean;
  rawMessage: SSEMessageModel;
}
