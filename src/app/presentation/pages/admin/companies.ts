import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder } from '@angular/forms';
// Using facade types; no direct item type import needed here
import { AdminCompaniesFacade } from '@app/application/admin/admin-companies.facade';

@Component({
  selector: 'app-admin-companies',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './companies.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminCompaniesPage {
  private readonly facade = inject(AdminCompaniesFacade);
  private readonly fb = inject(FormBuilder);

  items = this.facade.items;
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
}
