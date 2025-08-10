import { Injectable, inject, signal } from '@angular/core';
import { RegisterUseCase } from '@core/use-cases/auth/register.usecase';

@Injectable({ providedIn: 'root' })
export class RegisterFacade {
  private readonly registerUC = inject(RegisterUseCase);

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  async register(payload: { email: string; password: string; username: string }) {
    if (this.loading()) return;
    this.loading.set(true);
    this.error.set(null);
    try {
      await this.registerUC.execute(payload);
    } catch (e: any) {
      const detail = e?.error?.detail;
      let errorMessage: string;
      if (Array.isArray(detail)) {
        errorMessage = detail.map((d: any) => d?.msg || d).join(' | ');
      } else {
        errorMessage = detail || e?.error?.message || e?.message || 'Error de registro';
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
      }
      this.error.set(errorMessage);
      throw e;
    } finally {
      this.loading.set(false);
    }
  }
}
