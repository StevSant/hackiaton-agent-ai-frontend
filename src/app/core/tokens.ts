import { InjectionToken } from '@angular/core';
import type { ChatStreamPort } from './ports/chat-stream.port';
import type { SessionsPort } from './ports/sessions.port';

export const CHAT_STREAM_PORT = new InjectionToken<ChatStreamPort>('CHAT_STREAM_PORT');
export const SESSIONS_PORT = new InjectionToken<SessionsPort>('SESSIONS_PORT');
