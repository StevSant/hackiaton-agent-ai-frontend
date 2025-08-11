import { Injectable, inject, signal } from '@angular/core';
import {
  AdminStatsDTO,
  AdminCompanyDashboardDTO,
} from '@core/ports/admin-stats.port';
import { AdminStatsService } from '@infrastructure/services/admin-stats.service';

@Injectable({ providedIn: 'root' })
export class AdminStatsFacade {
  private readonly api = inject(AdminStatsService);

  readonly loading = signal(false);
  readonly data = signal<AdminStatsDTO | null>(null);
  readonly error = signal<string | null>(null);

  readonly companyLoading = signal(false);
  readonly company = signal<AdminCompanyDashboardDTO | null>(null);
  readonly companyError = signal<string | null>(null);

  async load(days = 30): Promise<void> {
    if (this.loading()) return;
    this.loading.set(true);
    this.error.set(null);
    try {
      const res = await this.api.getOverview(days);
      this.data.set(res);
    } catch (e: any) {
      this.error.set(e?.message ?? 'Failed to load stats');
    } finally {
      this.loading.set(false);
    }
  }

  async loadCompany(taxId: string): Promise<void> {
    if (!taxId || this.companyLoading()) return;
    this.companyLoading.set(true);
    this.companyError.set(null);
    try {
      const res = await this.api.getCompanyDashboard(taxId);
      this.company.set(res);
    } catch (e: any) {
      this.companyError.set(e?.message ?? 'Failed to load company dashboard');
    } finally {
      this.companyLoading.set(false);
    }
  }
}
