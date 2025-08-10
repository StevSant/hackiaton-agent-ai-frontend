import { inject, Injectable, signal } from '@angular/core';
import { AdminListSessionsUseCase, AdminListMessagesUseCase } from '@core/use-cases';
import type { AdminSessionItem, AdminMessageItem } from '@core/ports';

@Injectable({ providedIn: 'root' })
export class AdminMessagesFacade {
  private readonly listSessionsUC = inject(AdminListSessionsUseCase);
  private readonly listMessagesUC = inject(AdminListMessagesUseCase);

  readonly sessions = signal<AdminSessionItem[]>([]);
  readonly selected = signal<string | null>(null);
  readonly messages = signal<AdminMessageItem[] | null>(null);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  async loadSessions() {
    this.loading.set(true); this.error.set(null);
    try {
      const res = await this.listSessionsUC.execute();
      this.sessions.set(res || []);
    } catch (e: any) {
      this.error.set(e?.message || 'Error cargando sesiones');
    } finally {
      this.loading.set(false);
    }
  }

  async open(sessionId: string) {
    this.selected.set(sessionId);
    this.loading.set(true); this.error.set(null);
    try {
      const res = await this.listMessagesUC.execute(sessionId);
      this.messages.set(res || []);
    } catch (e: any) {
      this.error.set(e?.message || 'Error cargando mensajes');
    } finally {
      this.loading.set(false);
    }
  }
}
