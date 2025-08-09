import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '@environments/environment';
import { firstValueFrom } from 'rxjs';
import { Paginated } from '@core/models/paginated';

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

export interface AdminUserItem {
  user_id: string;
  username: string;
  email: string;
  role: string;
  created_at?: string;
}

export interface CreateUserPayload {
  username: string;
  email: string;
  password: string;
  role?: 'admin' | 'user';
}

@Injectable({ providedIn: 'root' })
export class AdminUsersService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.baseUrl;

  async list(params?: { page?: number; limit?: number; email?: string; sort_by?: 'email'|'username'|'created_at'; sort_order?: 'asc'|'desc' }): Promise<Paginated<AdminUserItem>> {
    const url = `${this.base}/users/`;
    const data = await firstValueFrom(
      this.http.get<PaginatedApi<AdminUserItem>>(url, { params: (params as any) || {} })
    );
    return {
      items: data?.results ?? [],
      page: data?.info?.page_number ?? params?.page ?? 1,
      limit: params?.limit ?? 10,
      total: data?.info?.count ?? 0,
    };
  }

  async get(userId: string): Promise<AdminUserItem> {
    const url = `${this.base}/users/${userId}`;
    return firstValueFrom(this.http.get<AdminUserItem>(url));
  }

  async create(payload: CreateUserPayload): Promise<AdminUserItem> {
    // Backend's register endpoint creates users
    const url = `${this.base}/auth/register`;
    return firstValueFrom(this.http.post<AdminUserItem>(url, payload));
  }

  async update(userId: string, payload: Partial<CreateUserPayload>): Promise<AdminUserItem> {
    const url = `${this.base}/users/${userId}`;
    return firstValueFrom(this.http.put<AdminUserItem>(url, payload));
  }

  async delete(userId: string): Promise<void> {
    const url = `${this.base}/users/${userId}`;
    await firstValueFrom(this.http.delete(url));
  }
}
