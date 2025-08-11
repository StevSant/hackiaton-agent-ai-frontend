import type { Observable } from 'rxjs';
import type { SessionEntry, ChatEntry } from '@core/models';

export interface SessionsPort {
  getSessions(agentId: string, params?: { page?: number; limit?: number }): Observable<SessionEntry[]>;
  getSession(agentId: string, sessionId: string): Observable<{ chats: ChatEntry[] }>;
  deleteSession(agentId: string, sessionId: string): Observable<void>;
  sendMessage(agentId: string, payload: { message?: string; session_id?: string; user_id?: string; audioFile?: File; files?: File[] }): Observable<any>;
}
