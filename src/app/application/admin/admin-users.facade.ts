import { inject, Injectable, signal, computed } from '@angular/core';
import type { AdminUserItem } from '@core/ports';
import { ListUsersUseCase, CreateUserUseCase, UpdateUserUseCase, DeleteUserUseCase } from '@core/use-cases';

@Injectable({ providedIn: 'root' })
export class AdminUsersFacade {
  private readonly listUC = inject(ListUsersUseCase);
  private readonly createUC = inject(CreateUserUseCase);
  private readonly updateUC = inject(UpdateUserUseCase);
  private readonly deleteUC = inject(DeleteUserUseCase);

  readonly creating = signal(false);
  readonly error = signal<string | null>(null);
  readonly users = signal<AdminUserItem[]>([]);
  readonly page = signal(1);
  readonly limit = signal(10);
  readonly total = signal(0);
  readonly search = signal('');
  readonly start = computed(() => (this.page() - 1) * this.limit() + 1);
  readonly end = computed(() => Math.min(this.page() * this.limit(), this.total()));
  readonly sortBy = signal<'email' | 'username' | 'created_at' | ''>('');
  readonly sortOrder = signal<'asc' | 'desc'>('asc');

  async refresh() {
    const res = await this.listUC.execute({
      page: this.page(),
      limit: this.limit(),
      email: this.search() || undefined,
      sort_by: (this.sortBy() || undefined) as any,
      sort_order: this.sortOrder(),
    });
    this.users.set(res.items || []);
    this.total.set(res.total || 0);
  }

  nextPage = async () => {
    if (this.page() * this.limit() >= this.total()) return;
    this.page.update((p) => p + 1);
    await this.refresh();
  };

  prevPage = async () => {
    if (this.page() <= 1) return;
    this.page.update((p) => p - 1);
    await this.refresh();
  };

  applySearch = async (value: string) => {
    this.search.set(value.trim());
    this.page.set(1);
    await this.refresh();
  };

  setSort = (field: 'email' | 'username' | 'created_at') => {
    if (this.sortBy() === field) {
      this.sortOrder.update((o) => (o === 'asc' ? 'desc' : 'asc'));
    } else {
      this.sortBy.set(field);
      this.sortOrder.set('asc');
    }
    this.page.set(1);
    this.refresh();
  };

  setLimit = async (limit: number) => {
    if (!Number.isFinite(limit) || limit <= 0) return;
    this.limit.set(limit);
    this.page.set(1);
    await this.refresh();
  };

  create = async (payload: { username: string; email: string; password: string; role: 'admin' | 'user' }) => {
    if (this.creating()) return;
    this.creating.set(true);
    this.error.set(null);
    try {
      await this.createUC.execute(payload);
      await this.refresh();
    } catch (e: any) {
      this.error.set(e?.error?.detail || e?.message || 'Error creando usuario');
    } finally {
      this.creating.set(false);
    }
  };

  update = async (userId: string, payload: any) => {
    await this.updateUC.execute(userId, payload);
    await this.refresh();
  };

  delete = async (userId: string) => {
    await this.deleteUC.execute(userId);
    await this.refresh();
  };
}
