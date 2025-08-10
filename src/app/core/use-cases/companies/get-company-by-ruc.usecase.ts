import { inject, Injectable } from '@angular/core';
import type { CompaniesPort, CompanyItem } from '@core/ports/companies.port';
import { COMPANIES_PORT } from '@core/tokens';

@Injectable({ providedIn: 'root' })
export class GetCompanyByRucUseCase {
  private readonly port = inject<CompaniesPort>(COMPANIES_PORT);
  execute(ruc: string): Promise<CompanyItem> {
    return this.port.getByRuc(ruc);
  }
}
