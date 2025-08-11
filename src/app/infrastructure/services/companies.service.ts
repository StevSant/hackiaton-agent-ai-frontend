import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '@environments/environment';
import { firstValueFrom } from 'rxjs';
import type { Paginated } from '@core/models/paginated';

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

  async list(params?: { page?: number; limit?: number; search?: string; sort_by?: 'tax_id'|'name'|'sector'; sort_order?: 'asc'|'desc' }): Promise<Paginated<CompanyItem>> {
    const url = `${this.base}/companies/`;
  const qp: any = {};
  const src = params || {};
  if (src.page != null) qp.page = String(src.page);
  if (src.limit != null) qp.limit = String(src.limit);
  if (src.search != null && src.search !== '') qp.search = src.search;
  if (src.sort_by != null) qp.sort_by = src.sort_by;
  if (src.sort_order != null) qp.sort_order = src.sort_order;
  const data = await firstValueFrom(this.http.get<any>(url, { params: qp }));
    // Support both paginated (info/results) and plain array responses
    if (Array.isArray(data)) {
      return { items: data, page: params?.page ?? 1, limit: params?.limit ?? (data?.length ?? 0), total: data?.length ?? 0 };
    }
    return {
      items: data?.results ?? [],
  page: data?.info?.page_number ?? params?.page ?? 1,
  limit: data?.results?.length ?? params?.limit ?? 10,
      total: data?.info?.count ?? (data?.results?.length ?? 0),
    } as Paginated<CompanyItem>;
  }

  async getByRuc(ruc: string): Promise<CompanyItem> {
    const url = `${this.base}/companies/${ruc}`;
    return firstValueFrom(this.http.get<CompanyItem>(url));
  }
}
