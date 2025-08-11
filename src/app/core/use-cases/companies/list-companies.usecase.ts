import { inject, Injectable } from '@angular/core';
import type { CompaniesPort, CompanyItem } from '@core/ports';
import type { Paginated } from '@core/models/paginated';
import { COMPANIES_PORT } from '@core/tokens';

@Injectable({ providedIn: 'root' })
export class ListCompaniesUseCase {
  private readonly port = inject<CompaniesPort>(COMPANIES_PORT);
  execute(params?: { page?: number; limit?: number; search?: string; sector?: string; sort_by?: 'tax_id'|'name'|'sector'; sort_order?: 'asc'|'desc' }): Promise<Paginated<CompanyItem>> {
    return this.port.list(params);
  }
}
