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

  async ngOnInit() { await this.search(); }

  async search() {
    const q = this.form.value.search?.trim() || '';
    const res = await this.api.list({ search: q || undefined });
    this.items.set(res || []);
  }
}
