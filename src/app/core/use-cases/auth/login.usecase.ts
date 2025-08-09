import { inject, Injectable } from '@angular/core';
import type { LoginRequest, LoginSuccessResponse } from '../../models/auth';
import type { AuthPort } from '../../ports/auth.port';
import { AUTH_PORT } from '../../tokens';

@Injectable({ providedIn: 'root' })
export class LoginUseCase {
  private readonly auth = inject<AuthPort>(AUTH_PORT);

  async execute(payload: LoginRequest): Promise<LoginSuccessResponse> {
    return this.auth.login(payload);
  }
}

