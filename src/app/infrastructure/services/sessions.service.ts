import { Injectable } from '@angular/core';
import { environment } from '@environments/environment';
import type { SessionEntry, ChatEntry } from '@core/models';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class SessionsService {
  private readonly base = environment.baseUrl;
  constructor(private readonly http: HttpClient) {}

  // agentId is ignored in backend; kept for API compatibility with UI
  getSessions(_agentId: string, params?: { page?: number; limit?: number }): Observable<SessionEntry[]> {
    const url = `${this.base}/agent/sessions`;
    return new Observable<SessionEntry[]>((subscriber) => {
      const sub = this.http.get<any>(url, { params: (params as any) || {} }).subscribe({
        next: (data) => {
          try {
            let array: any[] = [];
            if (Array.isArray(data)) {
              array = data;
            } else if (Array.isArray(data?.results)) {
              array = data.results;
            } else if (Array.isArray(data?.sessions)) {
              array = data.sessions;
            }
            const sessions: SessionEntry[] = (array || []).map((s: any) => ({
              session_id: s.session_id,
              title: s.title || '',
              summary: s.summary || s.resume || undefined,
              created_at: toEpochSeconds(s.created_at),
              updated_at: s.updated_at ? toEpochSeconds(s.updated_at) : undefined,
            }));
            subscriber.next(sessions);
            subscriber.complete();
          } catch (e) {
            subscriber.error(e);
          }
        },
        error: (err) => subscriber.error(err),
      });
      return () => sub.unsubscribe();
    });
  }

  getSession(_agentId: string, sessionId: string): Observable<{ chats: ChatEntry[] }> {
    // Backend returns flat list of messages; adapt at the component adapter
    const url = `${this.base}/agent/sessions/${sessionId}/messages`;
    const source$ = this.http.get<any>(url);
    return new Observable<{ chats: ChatEntry[] }>((subscriber) => {
      const sub = source$.subscribe({
        next: (data: any) => {
          try {
            let items: any[] = [];
            if (Array.isArray(data)) {
              items = data;
            } else if (Array.isArray(data?.results)) {
              items = data.results;
            } else if (Array.isArray(data?.messages)) {
              items = data.messages;
            } else if (Array.isArray(data?.chats)) {
              items = data.chats;
            }
            const chats = this.mapMessagesToChats(items);
            subscriber.next({ chats });
            subscriber.complete();
          } catch (e) {
            subscriber.error(e);
          }
        },
        error: (err) => subscriber.error(err),
      });
      return () => sub.unsubscribe();
    });
  }

  private mapMessagesToChats(items: any[]): ChatEntry[] {
    const chats: ChatEntry[] = [];
    const sorted = [...(items || [])].sort((a, b) => toMs(a?.created_at) - toMs(b?.created_at));
    let idx = 0;
    while (idx < sorted.length) {
      const msg = sorted[idx];
      if (msg.role === 'user') {
        const next = sorted[idx + 1];
        const createdUser = toEpochSeconds(msg.created_at);
        if (next && next.role === 'agent') {
          const createdAgent = toEpochSeconds(next.created_at);
          chats.push({
            message: { role: 'user', content: msg.content, created_at: createdUser },
            response: { content: next.content, created_at: createdAgent, tools: [], extra_data: {}, images: [], videos: [], audio: [], response_audio: {} },
          });
          idx += 2;
          continue;
        }
        chats.push({
          message: { role: 'user', content: msg.content, created_at: createdUser },
          response: { content: '', created_at: createdUser },
        } as any);
      }
      idx += 1;
    }
    return chats;
  }

  deleteSession(_agentId: string, sessionId: string): Observable<void> {
    const url = `${this.base}/agent/sessions/${sessionId}`;
    return this.http.delete<void>(url);
  }
}

// Helpers
function toMs(value: any): number {
  if (typeof value === 'number') {
    // treat values < 10^12 as seconds
    return value > 1e12 ? value : value * 1000;
  }
  const t = Date.parse(value);
  return Number.isFinite(t) ? t : 0;
}

function toEpochSeconds(value: any): number {
  const ms = toMs(value);
  return Math.floor(ms / 1000);
}
