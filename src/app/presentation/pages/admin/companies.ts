import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder } from '@angular/forms';
import { CompaniesService, CompanyItem } from '@infrastructure/services/companies.service';

@Component({
  selector: 'app-admin-companies',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './companies.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminCompaniesPage {
  private readonly api = inject(CompaniesService);
  private readonly fb = inject(FormBuilder);

  items = signal<CompanyItem[]>([]);
  form = this.fb.group({ search: [''] });
  page = signal(1);
  limit = signal(20);
  total = signal(0);
  sortBy = signal<'tax_id'|'name'|'sector'|''>('');
  sortOrder = signal<'asc'|'desc'>('asc');

  async ngOnInit() { await this.refresh(); }

  async refresh() {
    const q = this.form.value.search?.trim() || '';
    const res = await this.api.list({ page: this.page(), limit: this.limit(), search: q || undefined });
    // Backend returns list only; total unknown. We'll approximate using length for now.
    this.items.set(res || []);
    // If backend adds pagination metadata, wire it; for now, simple count.
    this.total.set(res?.length ?? 0);
  }

  async applySearch() {
    this.page.set(1);
    await this.refresh();
  }

  async nextPage() {
    this.page.update(p => p + 1);
    await this.refresh();
  }

  async prevPage() {
    if (this.page() <= 1) return;
    this.page.update(p => p - 1);
    await this.refresh();
  }

  setSort(field: 'tax_id'|'name'|'sector') {
    if (this.sortBy() === field) {
      this.sortOrder.update(o => (o === 'asc' ? 'desc' : 'asc'));
    } else {
      this.sortBy.set(field);
      this.sortOrder.set('asc');
    }
    this.page.set(1);
    this.refresh();
  }
}
