import { inject, Injectable } from '@angular/core';
import type { AdminMessagesPort, AdminMessageItem } from '@core/ports/admin-messages.port';
import { ADMIN_MESSAGES_PORT } from '@core/tokens';

@Injectable({ providedIn: 'root' })
export class AdminListMessagesUseCase {
  private readonly port = inject<AdminMessagesPort>(ADMIN_MESSAGES_PORT);
  execute(sessionId: string): Promise<AdminMessageItem[]> {
    return this.port.listMessages(sessionId);
  }
}
