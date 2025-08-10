import { inject, Injectable } from '@angular/core';
import type { AdminUsersPort } from '@core/ports';
import { ADMIN_USERS_PORT } from '@core/tokens';

@Injectable({ providedIn: 'root' })
export class DeleteUserUseCase {
  private readonly port = inject<AdminUsersPort>(ADMIN_USERS_PORT);
  execute(userId: string): Promise<void> {
    return this.port.delete(userId);
  }
}
