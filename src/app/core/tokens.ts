import { InjectionToken } from '@angular/core';
import type { ChatStreamPort } from './ports/chat-stream.port';
import type { SessionsPort } from './ports/sessions.port';
import type { AuthPort } from './ports/auth.port';
import type { AppInfoPort } from './ports/app-info.port';
import type { FilesPort } from './ports/files.port';
import type { SttPort } from './ports/stt.port';

export const CHAT_STREAM_PORT = new InjectionToken<ChatStreamPort>('CHAT_STREAM_PORT');
export const SESSIONS_PORT = new InjectionToken<SessionsPort>('SESSIONS_PORT');
export const AUTH_PORT = new InjectionToken<AuthPort>('AUTH_PORT');
export const APP_INFO_PORT = new InjectionToken<AppInfoPort>('APP_INFO_PORT');
export const FILES_PORT = new InjectionToken<FilesPort>('FILES_PORT');
export const STT_PORT = new InjectionToken<SttPort>('STT_PORT');
