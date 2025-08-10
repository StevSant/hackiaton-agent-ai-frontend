import type { Observable } from 'rxjs';
import type { SessionEntry, ChatEntry } from '@core/models';

export interface SessionsPort {
  getSessions(agentId: string): Observable<SessionEntry[]>;
  getSession(agentId: string, sessionId: string): Observable<{ chats: ChatEntry[] }>;
  deleteSession(agentId: string, sessionId: string): Observable<void>;
}
