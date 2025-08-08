import { Injectable, inject } from '@angular/core';
import { environment } from '@environments/environment';
import { httpResource } from '@angular/common/http';
import type { SessionEntry, ChatEntry } from '@core/models/playground-models';

@Injectable({ providedIn: 'root' })
export class SessionsService {
  private readonly base = environment.playgroundApiUrl;

  getSessions(agentId: string) {
    return httpResource<SessionEntry[]>(
      () => `${this.base}/v1/playground/agents/${agentId}/sessions`,
      {
        parse: (r) => Array.isArray(r) ? r as SessionEntry[] : [],
      }
    );
  }

  getSession(agentId: string, sessionId: string) {
    return httpResource<{ chats: ChatEntry[] }>(
      () => `${this.base}/v1/playground/agents/${agentId}/sessions/${sessionId}`,
      { parse: (r) => r }
    );
  }

  deleteSession(agentId: string, sessionId: string) {
    return httpResource<Response>(
      () => `${this.base}/v1/playground/agents/${agentId}/sessions/${sessionId}`,
      { method: 'DELETE', parse: (r) => r }
    );
  }
}
