import type { Observable } from 'rxjs';
import type { SessionsPort } from '@core/ports/sessions.port';

export class DeleteSessionUseCase {
  constructor(private readonly sessions: SessionsPort) {}
  execute(agentId: string, sessionId: string): Observable<void> {
    return this.sessions.deleteSession(agentId, sessionId);
  }
}
