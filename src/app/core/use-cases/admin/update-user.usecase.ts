import { inject, Injectable } from '@angular/core';
import type { AdminUserItem, AdminUsersPort, CreateUserPayload } from '@core/ports';
import { ADMIN_USERS_PORT } from '@core/tokens';

@Injectable({ providedIn: 'root' })
export class UpdateUserUseCase {
  private readonly port = inject<AdminUsersPort>(ADMIN_USERS_PORT);
  execute(userId: string, payload: Partial<CreateUserPayload>): Promise<AdminUserItem> {
    return this.port.update(userId, payload);
  }
}
