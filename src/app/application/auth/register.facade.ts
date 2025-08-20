import { Injectable, inject, signal } from '@angular/core';
import { RegisterUseCase } from '@core/use-cases/auth/register.usecase';
import { LoginUseCase } from '@core/use-cases/auth/login.usecase';
import { TokenStorageService } from '@infrastructure/services/token-storage.service';

@Injectable({ providedIn: 'root' })
export class RegisterFacade {
  private readonly registerUC = inject(RegisterUseCase);
  private readonly loginUC = inject(LoginUseCase);
  private readonly token = inject(TokenStorageService);

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  private static readonly patterns: Array<[RegExp, string]> = [
    [/(already|exists|duplicate)/i, 'El email ya está registrado'],
    [/(invalid.*email|email.*invalid)/i, 'El email no es válido'],
    [/uppercase/i, 'La contraseña debe tener al menos una MAYÚSCULA'],
    [/lowercase/i, 'La contraseña debe tener al menos una minúscula'],
    [/digit/i, 'La contraseña debe incluir al menos un número'],
    [/(at least 8|minimum 8|min_length.*8)/i, 'La contraseña debe tener mínimo 8 caracteres'],
  ];

  private parseBackendError(e: any): string {
    const err = e?.error || {};
    const errorsMap = (err?.errors ?? null) as Record<string, string[]> | null;
    const detail = err?.detail;
    let msg: string = '';
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
    if (!msg) msg = String(err?.message || e?.message || 'Error de registro');
    // Map common backend messages to friendly Spanish messages
    for (const [re, friendly] of RegisterFacade.patterns) {
      if (re.test(msg)) return friendly;
    }
    return msg;
  }

  async register(payload: {
    email: string;
    password: string;
    username: string;
  }): Promise<void> {
    if (this.loading()) return;
    this.loading.set(true);
    this.error.set(null);
    try {
      await this.registerUC.execute(payload);
      // Auto-login after successful register for smoother UX
      const loginRes = await this.loginUC.execute({
        email: payload.email,
        password: payload.password,
      });
      this.token.setToken(loginRes.token.access_token);
      if (loginRes.user) {
        this.token.setUser(loginRes.user);
        if ((loginRes.user as any).role) this.token.setRole((loginRes.user as any).role);
      }
    } catch (e: any) {
      this.error.set(this.parseBackendError(e));
      throw e;
    } finally {
      this.loading.set(false);
    }
  }
}
