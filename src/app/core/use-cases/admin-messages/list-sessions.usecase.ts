import { inject, Injectable } from '@angular/core';
import type { AdminMessagesPort, AdminSessionItem } from '@core/ports';
import { ADMIN_MESSAGES_PORT } from '@core/tokens';

@Injectable({ providedIn: 'root' })
export class AdminListSessionsUseCase {
  private readonly port = inject<AdminMessagesPort>(ADMIN_MESSAGES_PORT);
  execute(): Promise<AdminSessionItem[]> {
    return this.port.listSessions();
  }
}
