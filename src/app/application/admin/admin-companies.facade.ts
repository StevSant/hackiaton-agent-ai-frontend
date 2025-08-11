import { inject, Injectable, signal } from '@angular/core';
import type { CompanyItem } from '@core/ports';
import { ListCompaniesUseCase } from '@core/use-cases';

@Injectable({ providedIn: 'root' })
export class AdminCompaniesFacade {
  private readonly listCompanies = inject(ListCompaniesUseCase);

  readonly items = signal<CompanyItem[]>([]);
  readonly page = signal(1);
  readonly limit = signal(20);
  readonly total = signal(0);
  readonly sortBy = signal<'tax_id'|'name'|'sector'|''>('');
  readonly sortOrder = signal<'asc'|'desc'>('asc');
  readonly search = signal('');
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  // optional sector filter (UI-driven)
  readonly sector = signal<string>('');

  async refresh() {
    this.loading.set(true);
    this.error.set(null);
    try {
      const res = await this.listCompanies.execute({
        page: this.page(),
        limit: this.limit(),
        search: this.search() || undefined,
  sector: this.sector() || undefined,
        sort_by: (this.sortBy() || undefined) as any,
        sort_order: this.sortOrder(),
      });
  this.items.set(res.items || []);
  this.total.set(res.total || 0);
    } catch (e: any) {
      this.error.set(e?.message || 'Error cargando compañías');
    } finally {
      this.loading.set(false);
    }
  }

  async applySearch(value: string) {
    this.search.set(value.trim());
    this.page.set(1);
    await this.refresh();
  }

  setSector(value: string) {
    this.sector.set((value || '').trim());
    this.page.set(1);
    return this.refresh();
  }

  async nextPage() {
  if (this.page() * this.limit() >= this.total()) return;
  this.page.update((p) => p + 1);
    await this.refresh();
  }

  async prevPage() {
  if (this.page() <= 1) return;
    this.page.update((p) => p - 1);
    await this.refresh();
  }

  setSort(field: 'tax_id'|'name'|'sector') {
    if (this.sortBy() === field) {
      this.sortOrder.update((o) => (o === 'asc' ? 'desc' : 'asc'));
    } else {
      this.sortBy.set(field);
      this.sortOrder.set('asc');
    }
    this.page.set(1);
    this.refresh();
  }

  setLimit = async (limit: number) => {
    if (!Number.isFinite(limit) || limit <= 0) return;
    this.limit.set(limit);
    this.page.set(1);
    await this.refresh();
  }
}
