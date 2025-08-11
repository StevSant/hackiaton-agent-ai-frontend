import { inject, Injectable } from '@angular/core';
import type { AdminMessagesPort, AdminMessageItem } from '@core/ports';
import type { Paginated } from '@core/models/paginated';
import { ADMIN_MESSAGES_PORT } from '@core/tokens';

@Injectable({ providedIn: 'root' })
export class AdminListMessagesUseCase {
  private readonly port = inject<AdminMessagesPort>(ADMIN_MESSAGES_PORT);
  execute(
    sessionId: string,
    params?: { page?: number; limit?: number },
  ): Promise<Paginated<AdminMessageItem>> {
    return this.port.listMessages(sessionId, params);
  }
}
