import { Component, ChangeDetectionStrategy, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
// Using facade types; no direct item type import needed here
import { AdminCompaniesFacade } from '@app/application/admin/admin-companies.facade';

@Component({
  selector: 'app-admin-companies',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslateModule],
  templateUrl: './companies.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminCompaniesPage {
  private readonly facade = inject(AdminCompaniesFacade);
  private readonly fb = inject(FormBuilder);

  items = this.facade.items;
  // UI-only filters derived from current items
  selectedSector = signal<string>('');
  sectors = computed(() => {
    const set = new Set<string>();
    for (const it of this.items() || []) { if (it.sector) set.add(it.sector); }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  });
  filteredItems = computed(() => {
    const sector = this.selectedSector();
    const arr = this.items() || [];
    if (!sector) return arr;
    return arr.filter(i => i.sector === sector);
  });
  page = this.facade.page;
  limit = this.facade.limit;
  total = this.facade.total;
  sortBy = this.facade.sortBy;
  sortOrder = this.facade.sortOrder;
  error = this.facade.error;
  loading = this.facade.loading;
  form = this.fb.group({ search: [''] });

  async ngOnInit() { await this.refresh(); }

  async refresh() { await this.facade.refresh(); }

  async applySearch() { await this.facade.applySearch(this.form.value.search?.trim() || ''); }

  async nextPage() { await this.facade.nextPage(); }

  async prevPage() { await this.facade.prevPage(); }

  setSort(field: 'tax_id'|'name'|'sector') { this.facade.setSort(field); }

  selectSector(sector: string) {
    this.selectedSector.update(curr => (curr === sector ? '' : sector));
  }

  async copyTaxId(taxId: string) {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(taxId);
      }
    } catch { /* noop */ }
  }
}
