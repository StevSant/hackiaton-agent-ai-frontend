import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '@environments/environment';
import type {
  AdminMessagesPort,
  AdminMessageItem,
  AdminSessionItem,
} from '@core/ports';
import type { Paginated } from '@core/models/paginated';

interface PaginatedApi<T> {
  info: {
    count: number;
    pages: number;
    page_number: number;
    next?: string | null;
    prev?: string | null;
  };
  results: T[];
}

@Injectable({ providedIn: 'root' })
export class AdminMessagesService implements AdminMessagesPort {
  private readonly http = inject(HttpClient);
  private readonly base = environment.baseUrl;

  async listSessions(params?: {
    page?: number;
    limit?: number;
    search?: string;
    sort_by?: 'updated_at' | 'title';
    sort_order?: 'asc' | 'desc';
  }): Promise<Paginated<AdminSessionItem>> {
    const url = `${this.base}/agent/sessions`;
    const qp: any = {};
    const src = params || {};
    if (src.page != null) qp.page = String(src.page);
    if (src.limit != null) qp.limit = String(src.limit);
    if (src.search != null && src.search !== '') qp.search = src.search;
    if (src.sort_by != null) qp.sort_by = src.sort_by;
    if (src.sort_order != null) qp.sort_order = src.sort_order;
    const data = await firstValueFrom(this.http.get<any>(url, { params: qp }));
    if (Array.isArray(data)) {
      return {
        items: data,
        page: params?.page ?? 1,
        limit: params?.limit ?? data?.length ?? 0,
        total: data?.length ?? 0,
      };
    }
    return {
      items: (data as PaginatedApi<AdminSessionItem>)?.results ?? [],
      page:
        (data as PaginatedApi<AdminSessionItem>)?.info?.page_number ??
        params?.page ??
        1,
      limit:
        (data as PaginatedApi<AdminSessionItem>)?.results?.length ??
        params?.limit ??
        10,
      total:
        (data as PaginatedApi<AdminSessionItem>)?.info?.count ??
        (data as PaginatedApi<AdminSessionItem>)?.results?.length ??
        0,
    };
  }

  async listMessages(
    sessionId: string,
    params?: { page?: number; limit?: number },
  ): Promise<Paginated<AdminMessageItem>> {
    const url = `${this.base}/agent/sessions/${sessionId}/messages`;
    const qp: any = {};
    const src = params || {};
    if (src.page != null) qp.page = String(src.page);
    if (src.limit != null) qp.limit = String(src.limit);
    const data = await firstValueFrom(this.http.get<any>(url, { params: qp }));
    if (Array.isArray(data)) {
      return {
        items: data,
        page: params?.page ?? 1,
        limit: params?.limit ?? data?.length ?? 0,
        total: data?.length ?? 0,
      };
    }
    return {
      items: (data as PaginatedApi<AdminMessageItem>)?.results ?? [],
      page:
        (data as PaginatedApi<AdminMessageItem>)?.info?.page_number ??
        params?.page ??
        1,
      limit:
        (data as PaginatedApi<AdminMessageItem>)?.results?.length ??
        params?.limit ??
        10,
      total:
        (data as PaginatedApi<AdminMessageItem>)?.info?.count ??
        (data as PaginatedApi<AdminMessageItem>)?.results?.length ??
        0,
    };
  }
}
