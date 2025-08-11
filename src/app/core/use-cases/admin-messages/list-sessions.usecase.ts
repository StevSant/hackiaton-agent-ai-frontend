import { inject, Injectable } from '@angular/core';
import type { AdminMessagesPort, AdminSessionItem } from '@core/ports';
import type { Paginated } from '@core/models/paginated';
import { ADMIN_MESSAGES_PORT } from '@core/tokens';

@Injectable({ providedIn: 'root' })
export class AdminListSessionsUseCase {
  private readonly port = inject<AdminMessagesPort>(ADMIN_MESSAGES_PORT);
  execute(params?: {
    page?: number;
    limit?: number;
    search?: string;
    sort_by?: 'updated_at' | 'title';
    sort_order?: 'asc' | 'desc';
  }): Promise<Paginated<AdminSessionItem>> {
    return this.port.listSessions(params);
  }
}
