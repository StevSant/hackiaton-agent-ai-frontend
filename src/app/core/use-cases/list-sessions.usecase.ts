import type { Observable } from 'rxjs';
import type { SessionEntry } from '@core/models/playground-models';
import type { SessionsPort } from '@core/ports/sessions.port';

export class ListSessionsUseCase {
  constructor(private readonly sessions: SessionsPort) {}
  execute(agentId: string): Observable<SessionEntry[]> {
    return this.sessions.getSessions(agentId);
  }
}
