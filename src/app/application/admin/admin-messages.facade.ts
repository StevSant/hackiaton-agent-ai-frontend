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
  // pagination state
  readonly page = signal(1);
  readonly limit = signal(20);
  readonly total = signal(0);
  readonly search = signal('');
  readonly sortBy = signal<'updated_at'|'title'|''>('');
  readonly sortOrder = signal<'asc'|'desc'>('desc');
  readonly msgPage = signal(1);
  readonly msgLimit = signal(50);
  readonly msgTotal = signal(0);

  async loadSessions() {
    this.loading.set(true); this.error.set(null);
    try {
      const res = await this.listSessionsUC.execute({
        page: this.page(),
        limit: this.limit(),
        search: this.search() || undefined,
        sort_by: (this.sortBy() || undefined) as any,
        sort_order: this.sortOrder(),
      });
      this.sessions.set(res.items || []);
      this.total.set(res.total || 0);
    } catch (e: any) {
      this.error.set(e?.message || 'Error cargando sesiones');
    } finally {
      this.loading.set(false);
    }
  }

  async open(sessionId: string) {
    this.selected.set(sessionId);
    this.msgPage.set(1);
    this.loading.set(true); this.error.set(null);
    try {
      const res = await this.listMessagesUC.execute(sessionId, { page: this.msgPage(), limit: this.msgLimit() });
      this.messages.set(res.items || []);
      this.msgTotal.set(res.total || 0);
    } catch (e: any) {
      this.error.set(e?.message || 'Error cargando mensajes');
    } finally {
      this.loading.set(false);
    }
  }

  async nextSessionsPage() {
    this.page.update(p => p + 1);
    await this.loadSessions();
  }
  async prevSessionsPage() {
    if (this.page() <= 1) {
      return;
    }
    this.page.update(p => p - 1);
    await this.loadSessions();
  }
  async applySessionsSearch(value: string) {
    this.search.set(value.trim());
    this.page.set(1);
    await this.loadSessions();
  }
  setSessionsSort(field: 'updated_at'|'title') {
    if (this.sortBy() === field) {
      this.sortOrder.update(o => (o === 'asc' ? 'desc' : 'asc'));
    } else {
      this.sortBy.set(field);
      this.sortOrder.set('desc');
    }
    this.page.set(1);
    this.loadSessions();
  }
  async nextMsgPage() {
    if (!this.selected()) return;
    if ((this.messages()?.length || 0) >= this.msgTotal()) return;
    this.msgPage.update(p => p + 1);
    const res = await this.listMessagesUC.execute(this.selected()!, { page: this.msgPage(), limit: this.msgLimit() });
    this.messages.update(arr => [...(arr || []), ...(res.items || [])]);
    this.msgTotal.set(res.total || 0);
  }
}
