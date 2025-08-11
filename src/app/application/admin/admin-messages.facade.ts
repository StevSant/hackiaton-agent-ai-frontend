import { inject, Injectable, signal } from '@angular/core';
import { AdminListSessionsUseCase, AdminListMessagesUseCase } from '@core/use-cases';
import type { AdminSessionItem, AdminMessageItem, AdminUsersPort, AdminUserItem } from '@core/ports';
import { ADMIN_USERS_PORT } from '@core/tokens';

@Injectable({ providedIn: 'root' })
export class AdminMessagesFacade {
  private readonly listSessionsUC = inject(AdminListSessionsUseCase);
  private readonly listMessagesUC = inject(AdminListMessagesUseCase);
  private readonly usersPort = inject<AdminUsersPort>(ADMIN_USERS_PORT);

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
  readonly msgLimit = signal(10);
  readonly msgTotal = signal(0);

  // cache user details to avoid repeated calls
  private readonly userCache = new Map<string, AdminUserItem>();

  async resolveUser(userId: string | null | undefined): Promise<AdminUserItem | null> {
    if (!userId) return null;
    const cached = this.userCache.get(userId);
    if (cached) return cached;
    try {
      const u = await this.usersPort.get(userId);
      if (u) this.userCache.set(userId, u);
      return u ?? null;
    } catch {
      return null;
    }
  }

  getCachedUserLabel(userId: string | null | undefined): string | null {
    if (!userId) return null;
    const u = this.userCache.get(userId);
    if (!u) return null;
    if (u.username && u.email) return `${u.username} <${u.email}>`;
    return u.email || u.username || userId;
  }

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
  // Warm up user cache for visible sessions
  const uniqUserIds = Array.from(new Set((res.items || []).map(s => s.user_id).filter(Boolean)));
  await Promise.all(uniqUserIds.map(id => this.resolveUser(id)));
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
  async nextSessionsInfinite() {
    // append next page of sessions if available
    if ((this.sessions().length || 0) >= this.total()) return;
    this.page.update(p => p + 1);
    this.loading.set(true);
    try {
      const res = await this.listSessionsUC.execute({
        page: this.page(),
        limit: this.limit(),
        search: this.search() || undefined,
        sort_by: (this.sortBy() || undefined) as any,
        sort_order: this.sortOrder(),
      });
      const next = res.items || [];
      // dedupe by session_id
      const map = new Map<string, AdminSessionItem>();
      for (const s of this.sessions()) map.set(s.session_id, s);
      for (const s of next) map.set(s.session_id, s);
      this.sessions.set(Array.from(map.values()));
      this.total.set(res.total || this.total());
    } catch (e: any) {
      this.error.set(e?.message || 'Error cargando sesiones');
    } finally {
      this.loading.set(false);
    }
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
