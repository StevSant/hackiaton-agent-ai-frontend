import { Injectable, inject, signal } from '@angular/core';
import { LoginUseCase } from '@core/use-cases/auth/login.usecase';
import type { LoginRequest, LoginSuccessResponse } from '@core/models/auth';
import { TokenStorageService } from '@infrastructure/services/token-storage.service';

@Injectable({ providedIn: 'root' })
export class LoginFacade {
  private readonly loginUC = inject(LoginUseCase);
  private readonly token = inject(TokenStorageService);

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  async login(
    payload: LoginRequest,
  ): Promise<LoginSuccessResponse | undefined> {
    if (this.loading()) return;
    this.loading.set(true);
    this.error.set(null);
    try {
      const res = await this.loginUC.execute(payload);
      // Persist tokens/role in application layer (not in presentation)
      this.token.setToken(res.token.access_token);
      if (res.user?.role) this.token.setRole(res.user.role);
      return res;
    } catch (e: any) {
      this.error.set(e?.error?.message || e?.message || 'Login failed');
      throw e;
    } finally {
      this.loading.set(false);
    }
  }
}
