import { inject, Injectable } from '@angular/core';
import type { AdminUserItem, AdminUsersPort, CreateUserPayload } from '@core/ports/admin-users.port';
import { ADMIN_USERS_PORT } from '@core/tokens';

@Injectable({ providedIn: 'root' })
export class CreateUserUseCase {
  private readonly port = inject<AdminUsersPort>(ADMIN_USERS_PORT);
  execute(payload: CreateUserPayload): Promise<AdminUserItem> {
    return this.port.create(payload);
  }
}
