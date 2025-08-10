import type { Observable } from 'rxjs';
import type { SessionEntry } from '@core/models';
import type { SessionsPort } from '@core/ports';

export class ListSessionsUseCase {
  constructor(private readonly sessions: SessionsPort) {}
  execute(agentId: string, params?: { page?: number; limit?: number }): Observable<SessionEntry[]> {
    return this.sessions.getSessions(agentId, params);
  }
}
