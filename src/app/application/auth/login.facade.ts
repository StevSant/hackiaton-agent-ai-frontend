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

  private parseBackendError(e: any): string {
    const err = e?.error || {};
    const errorsMap = (err?.errors ?? null) as Record<string, string[]> | null;
    const detail = err?.detail;
  let msg: string | undefined;

    if (errorsMap && typeof errorsMap === 'object') {
      const joined = Object.values(errorsMap).flat().filter(Boolean).join(' | ');
      if (joined) msg = joined;
    }
    if (!msg && Array.isArray(detail)) {
      const joined = detail
        .map((d: any) => d?.message || d?.msg || d)
        .filter(Boolean)
        .join(' | ');
      if (joined) msg = joined;
    }
    msg = msg || err?.message || e?.message || 'Error de autenticación';
  const finalMsg = msg ?? 'Error de autenticación';
  if (/invalid credentials|unauthorized/i.test(finalMsg)) return 'Credenciales inválidas';
  return finalMsg;
  }

  async login(
    payload: LoginRequest,
  ): Promise<LoginSuccessResponse | undefined> {
    if (this.loading()) return;
    this.loading.set(true);
    this.error.set(null);
    try {
      const res = await this.loginUC.execute(payload);
      // Persist tokens/role/user in application layer (not in presentation)
      this.token.setToken(res.token.access_token);
      if (res.user) {
        this.token.setUser(res.user);
        if ((res.user as any).role) this.token.setRole((res.user as any).role);
      }
      return res;
    } catch (e: any) {
      const msg = this.parseBackendError(e);
      this.error.set(msg);
      throw e;
    } finally {
      this.loading.set(false);
    }
  }
}
