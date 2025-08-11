import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, catchError, of, switchMap } from 'rxjs';

import { environment } from '@environments/environment';
import type { SessionEntry, ChatEntry } from '@core/models';
import type { SessionsPort } from '@core/ports';
import type { SessionCompaniesAnalysis } from '@core/models/session-analysis';

@Injectable({ providedIn: 'root' })
export class SessionsService implements SessionsPort {
  private readonly base = environment.baseUrl;

  constructor(private readonly http: HttpClient) {}

  // agentId is ignored in backend; kept for API compatibility with UI
  getSessions(
    agentId: string,
    params?: { page?: number; limit?: number },
  ): Observable<SessionEntry[]> {
    const url = `${this.base}/agent/sessions`;
    return this.http.get<any>(url, { params: (params as any) || {} }).pipe(
      map((data: any) => {
        let array: any[] = [];
        if (Array.isArray(data)) array = data;
        else if (Array.isArray(data?.results)) array = data.results;
        else if (Array.isArray(data?.sessions)) array = data.sessions;

        const sessions: SessionEntry[] = (array || []).map((s: any) => ({
          session_id: s.session_id,
          title: s.title || '',
          summary: s.summary ?? s.resume ?? undefined,
          created_at: toEpochSeconds(s.created_at),
          updated_at: s.updated_at ? toEpochSeconds(s.updated_at) : undefined,
        }));

        return sessions;
      }),
    );
  }

  getSession(
    agentId: string,
    sessionId: string,
  ): Observable<{ chats: ChatEntry[] }> {
    const url = `${this.base}/agent/sessions/${sessionId}/messages`;
    return this.http.get<any>(url).pipe(
      map((data: any) => {
        let items: any[] = [];
        if (Array.isArray(data)) items = data;
        else if (Array.isArray(data?.results)) items = data.results;
        else if (Array.isArray(data?.messages)) items = data.messages;
        else if (Array.isArray(data?.chats)) items = data.chats;

        const chats = this.mapMessagesToChats(items);
        return { chats };
      }),
    );
  }

  sendMessage(
    agentId: string,
    payload: {
      message?: string;
      session_id?: string;
      user_id?: string;
      audioFile?: File;
      files?: File[];
    },
  ): Observable<any> {
    const hasBinary = !!(
      payload.audioFile ||
      (payload.files && payload.files.length)
    );
    const creating = !payload.session_id;

    // Candidatos (orden) dependiendo si existe sesión
    const endpoints: string[] = creating
      ? [
          `${this.base}/agent/message`, // probable endpoint correcto (equivalente al stream pero sin /stream)
          `${this.base}/agent/messages`,
          `${this.base}/agent/sessions/messages`,
        ]
      : [
          `${this.base}/agent/sessions/${payload.session_id}/messages`,
          `${this.base}/agent/message`,
          `${this.base}/agent/messages`,
          `${this.base}/agent/sessions/${payload.session_id}/message`,
        ];

    const buildFormData = () => {
      const fd = new FormData();
      if (payload.message) {
        fd.append('message', payload.message); // compat clave antigua
        fd.append('content', payload.message); // clave usada en SSE
      }
      if (payload.user_id) fd.append('user_id', payload.user_id);
      if (payload.session_id) fd.append('session_id', payload.session_id);
      if (payload.audioFile) fd.append('audio', payload.audioFile);
      payload.files?.forEach((f, i) =>
        fd.append('files', f, f.name || `file-${i}`),
      );
      return fd;
    };
    const buildJson = () => ({
      message: payload.message, // legado
      content: payload.message, // alineado con endpoint de stream
      user_id: payload.user_id,
      session_id: payload.session_id,
    });
    const baseBody: any = hasBinary ? buildFormData() : buildJson();

    let lastStructuredError: any = null;

    const tryNext = (idx: number): Observable<any> => {
      if (idx >= endpoints.length) {
        return of({
          error: true,
          message:
            'No se pudo enviar el mensaje (fallaron todos los endpoints) ',
          lastError: lastStructuredError,
        });
      }
      const url = endpoints[idx];
      return this.http.post<any>(url, baseBody).pipe(
        catchError((err) => {
          if ([404, 405].includes(err?.status)) {
            lastStructuredError = {
              status: err.status,
              url,
              bodyKeys: hasBinary ? 'FormData' : Object.keys(baseBody),
            };
            return tryNext(idx + 1);
          }
          return of({
            error: true,
            message: 'Error enviando mensaje',
            status: err?.status,
            url,
          });
        }),
      );
    };

    return tryNext(0).pipe(
      switchMap((resp: any) => {
        if (creating && resp && !payload.session_id && resp.session_id) {
          return of({ ...resp, created_new_session: true });
        }
        return of(resp);
      }),
    );
  }

  deleteSession(agentId: string, sessionId: string): Observable<void> {
    const url = `${this.base}/agent/sessions/${sessionId}`;
    return this.http.delete<void>(url);
  }

  analyzeCompanies(agentId: string, sessionId: string) {
    const url = `${this.base}/agent/sessions/${sessionId}/companies/analysis`;
    return this.http.get<SessionCompaniesAnalysis>(url);
  }

  // ---- Internal helpers ----
  private mapMessagesToChats(items: any[]): ChatEntry[] {
    const sorted = [...(items || [])].sort(
      (a, b) => toMs(a?.created_at) - toMs(b?.created_at),
    );

    const chats: ChatEntry[] = [];
    let idx = 0;

    while (idx < sorted.length) {
      const msg = sorted[idx];
      if (msg?.role === 'user') {
        const next = sorted[idx + 1];
        const createdUser = toEpochSeconds(msg.created_at);

        if (next && next.role === 'agent') {
          const createdAgent = toEpochSeconds(next.created_at);
          chats.push({
            message: {
              role: 'user',
              content: msg.content,
              created_at: createdUser,
            },
            // Keeping extras to satisfy UI expectations; shape may be narrowed by ChatEntry
            response: {
              content: next.content,
              created_at: createdAgent,
              tools: [],
              extra_data: {},
              images: [],
              videos: [],
              audio: [],
              response_audio: {},
            } as any,
          });
          idx += 2;
          continue;
        }

        // orphan user message (no immediate agent reply)
        chats.push({
          message: {
            role: 'user',
            content: msg.content,
            created_at: createdUser,
          },
          response: { content: '', created_at: createdUser } as any,
        });
      }
      idx += 1;
    }

    return chats;
  }
}

/** Convert various timestamp inputs to milliseconds (accepts seconds, ms, or ISO) */
function toMs(value: any): number {
  if (typeof value === 'number') {
    // treat numeric values < 10^12 as seconds
    return value > 1e12 ? value : value * 1000;
  }
  const t = Date.parse(value);
  return Number.isFinite(t) ? t : 0;
}

function toEpochSeconds(value: any): number {
  const ms = toMs(value);
  return Math.floor(ms / 1000);
}
