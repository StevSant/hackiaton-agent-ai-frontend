import { inject, Injectable } from '@angular/core';
import type { AuthResponse, LoginRequest } from '../../models/auth';
import type { AuthPort } from '../../ports/auth.port';
import { AUTH_PORT } from '../../tokens';

@Injectable({ providedIn: 'root' })
export class LoginUseCase {
  private auth = inject<AuthPort>(AUTH_PORT);

  async execute(payload: LoginRequest): Promise<AuthResponse> {
    return this.auth.login(payload);
  }
}

