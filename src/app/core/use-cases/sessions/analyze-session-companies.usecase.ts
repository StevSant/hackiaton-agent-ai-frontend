import { inject, Injectable } from '@angular/core';
import { SESSIONS_PORT } from '@core/tokens';
import type { SessionsPort } from '@core/ports/sessions.port';
import type { Observable } from 'rxjs';
import type { SessionCompaniesAnalysis } from '@core/models/session-analysis';

@Injectable({ providedIn: 'root' })
export class AnalyzeSessionCompaniesUseCase {
  private readonly sessions = inject<SessionsPort>(SESSIONS_PORT);
  execute(sessionId: string): Observable<SessionCompaniesAnalysis> {
    // agentId is not used by backend
    return this.sessions.analyzeCompanies('default', sessionId);
  }
}
