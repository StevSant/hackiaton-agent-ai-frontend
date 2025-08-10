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
  getSessions(_agentId: string): Observable<SessionEntry[]> {
    const url = `${this.base}/agent/sessions`;
    return new Observable<SessionEntry[]>((subscriber) => {
      const sub = this.http.get<any[]>(url).subscribe({
        next: (items) => {
          try {
            const sessions: SessionEntry[] = (items || []).map((s: any) => ({
              session_id: s.session_id,
              title: s.title || '',
              created_at: Math.floor(new Date(s.created_at).getTime() / 1000),
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
    const source$ = this.http.get<any[]>(url);
    return new Observable<{ chats: ChatEntry[] }>((subscriber) => {
      const sub = source$.subscribe({
        next: (items: any[]) => {
          try {
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
    const sorted = [...(items || [])].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
    let idx = 0;
    while (idx < sorted.length) {
      const msg = sorted[idx];
      if (msg.role === 'user') {
        const next = sorted[idx + 1];
        const createdUser = Math.floor(new Date(msg.created_at).getTime() / 1000);
        if (next && next.role === 'agent') {
          const createdAgent = Math.floor(new Date(next.created_at).getTime() / 1000);
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
