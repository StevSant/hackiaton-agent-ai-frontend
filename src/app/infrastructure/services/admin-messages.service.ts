import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '@environments/environment';
import type { AdminMessagesPort, AdminMessageItem, AdminSessionItem } from '@core/ports';
import type { Paginated } from '@core/models/paginated';

interface PaginatedApi<T> {
  info: { count: number; pages: number; page_number: number; next?: string | null; prev?: string | null };
  results: T[];
}

@Injectable({ providedIn: 'root' })
export class AdminMessagesService implements AdminMessagesPort {
  private readonly http = inject(HttpClient);
  private readonly base = environment.baseUrl;

  async listSessions(params?: { page?: number; limit?: number; search?: string; sort_by?: 'updated_at'|'title'; sort_order?: 'asc'|'desc' }): Promise<Paginated<AdminSessionItem>> {
    const url = `${this.base}/agent/sessions`;
    const data = await firstValueFrom(this.http.get<PaginatedApi<AdminSessionItem>>(url, { params: (params as any) || {} }));
    return {
      items: data?.results ?? [],
      page: data?.info?.page_number ?? params?.page ?? 1,
      limit: params?.limit ?? 10,
      total: data?.info?.count ?? (data?.results?.length ?? 0),
    };
  }

  async listMessages(sessionId: string, params?: { page?: number; limit?: number }): Promise<Paginated<AdminMessageItem>> {
    const url = `${this.base}/agent/sessions/${sessionId}/messages`;
    const data = await firstValueFrom(this.http.get<PaginatedApi<AdminMessageItem>>(url, { params: (params as any) || {} }));
    return {
      items: data?.results ?? [],
      page: data?.info?.page_number ?? params?.page ?? 1,
      limit: params?.limit ?? 10,
      total: data?.info?.count ?? (data?.results?.length ?? 0),
    };
  }
}
