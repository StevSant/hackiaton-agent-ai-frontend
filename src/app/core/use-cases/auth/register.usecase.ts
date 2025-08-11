import { inject, Injectable } from '@angular/core';
import type {
  RegisterRequest,
  RegisterSuccessResponse,
} from '../../models/auth';
import type { AuthPort } from '../../ports/auth.port';
import { AUTH_PORT } from '../../tokens';

@Injectable({ providedIn: 'root' })
export class RegisterUseCase {
  private readonly auth = inject<AuthPort>(AUTH_PORT);

  async execute(payload: RegisterRequest): Promise<RegisterSuccessResponse> {
    return this.auth.register(payload);
  }
}
