import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '@environments/environment';
import type { AdminMessagesPort, AdminMessageItem, AdminSessionItem } from '@core/ports/admin-messages.port';

@Injectable({ providedIn: 'root' })
export class AdminMessagesService implements AdminMessagesPort {
  private readonly http = inject(HttpClient);
  private readonly base = environment.baseUrl;

  async listSessions(): Promise<AdminSessionItem[]> {
    const url = `${this.base}/agent/sessions`;
    return firstValueFrom(this.http.get<AdminSessionItem[]>(url));
  }

  async listMessages(sessionId: string): Promise<AdminMessageItem[]> {
    const url = `${this.base}/agent/sessions/${sessionId}/messages`;
    return firstValueFrom(this.http.get<AdminMessageItem[]>(url));
  }
}
