import type { Observable } from 'rxjs';
import type { ChatEntry } from '@core/models';
import type { SessionsPort } from '@core/ports';

export class GetSessionUseCase {
  constructor(private readonly sessions: SessionsPort) {}
  execute(agentId: string, sessionId: string): Observable<{ chats: ChatEntry[] }> {
    return this.sessions.getSession(agentId, sessionId);
  }
}
