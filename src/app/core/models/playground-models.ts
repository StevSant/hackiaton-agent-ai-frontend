// Core DTOs/Models aligned with Next.js agent-ui types

export enum RunEvent {
  RunStarted = 'RunStarted',
  RunResponse = 'RunResponse',
  RunResponseContent = 'RunResponseContent',
  RunCompleted = 'RunCompleted',
  RunError = 'RunError',
  ToolCallStarted = 'ToolCallStarted',
  ToolCallCompleted = 'ToolCallCompleted',
  UpdatingMemory = 'UpdatingMemory',
  ReasoningStarted = 'ReasoningStarted',
  ReasoningStep = 'ReasoningStep',
  ReasoningCompleted = 'ReasoningCompleted',
}

export interface ReasoningSteps {
  title: string;
  action?: string;
  result: string;
  reasoning: string;
  confidence?: number;
  next_action?: string;
}

export interface Reference {
  content: string;
  meta_data: {
    chunk: number;
    chunk_size: number;
  };
  name: string;
}

export interface ReferenceData {
  query: string;
  references: Reference[];
  time?: number;
}

export interface ResponseAudio {
  id?: string;
  content?: string;
  transcript?: string;
  channels?: number;
  sample_rate?: number;
}

export interface ImageData {
  revised_prompt: string;
  url: string;
}

export interface VideoData {
  id: number;
  eta: number;
  url: string;
}

export interface AudioData {
  base64_audio?: string;
  mime_type?: string;
  url?: string;
  id?: string;
  content?: string;
  channels?: number;
  sample_rate?: number;
}

export interface PlaygroundAgentExtraData {
  reasoning_steps?: ReasoningSteps[];
  references?: ReferenceData[];
}

export interface RunResponse {
  content?: string | object;
  content_type: string;
  context?: Array<Record<string, unknown>>;
  event: RunEvent | string;
  event_data?: object;
  model?: string;
  run_id?: string;
  agent_id?: string;
  session_id?: string;
  created_at: number;
  extra_data?: PlaygroundAgentExtraData;
  images?: ImageData[];
  videos?: VideoData[];
  audio?: AudioData[];
  response_audio?: ResponseAudio;
  tool?: any;
  tools?: any[];
}

export interface SessionEntry {
  session_id: string;
  title: string;
  summary?: string;
  created_at: number;
  updated_at?: number;
}

export interface ChatEntry {
  message: {
    role: 'user' | 'system' | 'tool' | 'assistant';
    content: string;
    created_at: number;
  file_ids?: string[]; // attachments associated to the user message
  };
  response: {
    content: string;
    tools?: any[];
    extra_data?: PlaygroundAgentExtraData;
    images?: ImageData[];
    videos?: VideoData[];
    audio?: AudioData[];
    response_audio?: {
      transcript?: string;
    };
    created_at: number;
  file_ids?: string[]; // usually empty for agent responses
  };
}
