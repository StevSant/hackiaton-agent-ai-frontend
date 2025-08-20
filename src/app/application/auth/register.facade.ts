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
      const detail = e?.error?.detail;
      let errorMessage: string;
      if (Array.isArray(detail)) {
        errorMessage = detail.map((d: any) => d?.msg || d).join(' | ');
      } else {
        errorMessage =
          detail || e?.error?.message || e?.message || 'Error de registro';
      }
      if (/uppercase/i.test(errorMessage)) {
        errorMessage = 'La contraseña debe tener al menos una MAYÚSCULA';
      } else if (/lowercase/i.test(errorMessage)) {
        errorMessage = 'La contraseña debe tener al menos una minúscula';
      } else if (/digit/i.test(errorMessage)) {
        errorMessage = 'La contraseña debe incluir al menos un número';
      } else if (/at least 8/i.test(errorMessage)) {
        errorMessage = 'La contraseña debe tener mínimo 8 caracteres';
      } else if (/(already|exists)/i.test(errorMessage)) {
        errorMessage = 'El email ya está registrado';
      } else if (/email/i.test(errorMessage) && /invalid/i.test(errorMessage)) {
        errorMessage = 'El email no es válido';
      }
      this.error.set(errorMessage);
      throw e;
    } finally {
      this.loading.set(false);
    }
  }
}
