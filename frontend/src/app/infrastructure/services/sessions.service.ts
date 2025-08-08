import { Injectable } from '@angular/core';
import { environment } from '@environments/environment';
import type { SessionEntry, ChatEntry } from '@core/models/playground-models';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class SessionsService {
  private readonly base = environment.playgroundApiUrl;
  constructor(private http: HttpClient) {}

  getSessions(agentId: string): Observable<SessionEntry[]> {
    const url = `${this.base}/v1/playground/agents/${agentId}/sessions`;
    return this.http.get<SessionEntry[]>(url);
  }

  getSession(agentId: string, sessionId: string): Observable<{ chats: ChatEntry[] }> {
    const url = `${this.base}/v1/playground/agents/${agentId}/sessions/${sessionId}`;
    return this.http.get<{ chats: ChatEntry[] }>(url);
  }

  deleteSession(agentId: string, sessionId: string): Observable<void> {
    const url = `${this.base}/v1/playground/agents/${agentId}/sessions/${sessionId}`;
    return this.http.delete<void>(url);
  }
}
