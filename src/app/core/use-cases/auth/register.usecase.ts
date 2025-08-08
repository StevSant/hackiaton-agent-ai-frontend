import { inject, Injectable } from '@angular/core';
import type { AuthResponse, RegisterRequest } from '../../models/auth';
import type { AuthPort } from '../../ports/auth.port';
import { AUTH_PORT } from '../../tokens';

@Injectable({ providedIn: 'root' })
export class RegisterUseCase {
  private auth = inject<AuthPort>(AUTH_PORT);

  async execute(payload: RegisterRequest): Promise<AuthResponse> {
    return this.auth.register(payload);
  }
}
