import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '@environments/environment';
import { firstValueFrom } from 'rxjs';

export interface CompanyItem {
  tax_id: string;
  name?: string;
  sector?: string;
  // ...other fields as available
}

@Injectable({ providedIn: 'root' })
export class CompaniesService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.baseUrl;

  async list(params?: { page?: number; limit?: number; search?: string; sort_by?: 'tax_id'|'name'|'sector'; sort_order?: 'asc'|'desc' }): Promise<CompanyItem[]> {
    const url = `${this.base}/companies/`;
    return firstValueFrom(this.http.get<CompanyItem[]>(url, { params: (params as any) || {} }));
  }

  async getByRuc(ruc: string): Promise<CompanyItem> {
    const url = `${this.base}/companies/${ruc}`;
    return firstValueFrom(this.http.get<CompanyItem>(url));
  }
}
