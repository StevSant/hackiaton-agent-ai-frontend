import { inject, Injectable } from '@angular/core';
import type { Paginated } from '@core/models/paginated';
import type { AdminUserItem, AdminUsersPort } from '@core/ports';
import { ADMIN_USERS_PORT } from '@core/tokens';

@Injectable({ providedIn: 'root' })
export class ListUsersUseCase {
  private readonly port = inject<AdminUsersPort>(ADMIN_USERS_PORT);
  execute(params?: {
    page?: number;
    limit?: number;
    email?: string;
    sort_by?: 'email' | 'username' | 'created_at';
    sort_order?: 'asc' | 'desc';
  }): Promise<Paginated<AdminUserItem>> {
    return this.port.list(params);
  }
}
