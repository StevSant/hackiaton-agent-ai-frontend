import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '@environments/environment';

interface MessageItem { id: string; role: 'user'|'agent'; content: string; created_at: string; file_ids: string[]; }
interface SessionItem { session_id: string; title: string; updated_at: string; }

@Component({
  selector: 'app-admin-messages',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './messages.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminMessagesPage {
  private readonly http = inject(HttpClient);
  private readonly base = environment.baseUrl;

  sessions = signal<SessionItem[]>([]);
  selected = signal<string | null>(null);
  messages = signal<MessageItem[] | null>(null);

  async ngOnInit() { await this.loadSessions(); }

  async loadSessions() {
    const url = `${this.base}/agent/sessions`;
    const res = await firstValueFrom(this.http.get<SessionItem[]>(url));
    this.sessions.set(res || []);
  }

  async open(sessionId: string) {
    this.selected.set(sessionId);
    const url = `${this.base}/agent/sessions/${sessionId}/messages`;
    const res = await firstValueFrom(this.http.get<MessageItem[]>(url));
    this.messages.set(res || []);
  }
}
