import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { RegisterUseCase } from '@core/use-cases/auth/register.usecase';

// Validator (debe ir antes del decorador para evitar problemas de orden)
export function passwordComplexityValidator(control: AbstractControl): ValidationErrors | null {
  const v: string = control.value || '';
  if (!v) return null;
  const fails: string[] = [];
  if (v.length < 8) fails.push('8+');
  if (!/[A-Z]/.test(v)) fails.push('1 mayúscula');
  if (!/[a-z]/.test(v)) fails.push('1 minúscula');
  if (!/\d/.test(v)) fails.push('1 dígito');
  return fails.length ? { passwordComplexity: fails } : null;
}

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule, RouterLink],
  templateUrl: './register.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})

export class RegisterPage {
  private readonly fb = inject(FormBuilder);
  private readonly registerUC = inject(RegisterUseCase);
  private readonly router = inject(Router);

  form = this.fb.group({
    username: [''], // optional, not sent to backend
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, passwordComplexityValidator]],
  });
  submitting = false;
  error: string | null = null;

  async submit() {
    if (this.form.invalid || this.submitting) return;
    this.submitting = true;
    this.error = null;
    try {
      // Normalizar entrada
      const email = (this.form.value.email || '').trim().toLowerCase();
      const password = this.form.value.password || '';
      // Si validator marca error, no llamar backend
      if (this.form.get('password')?.errors) {
        this.error = 'La contraseña no cumple los requisitos.';
        return;
      }
      await this.registerUC.execute({
        email,
        password,
        username: this.form.value.username || undefined,
      });
      this.router.navigateByUrl('/login');
    } catch (e: any) {
      const detail = e?.error?.detail;
      if (Array.isArray(detail)) {
        this.error = detail.map((d: any) => d?.msg || d).join(' | ');
      } else {
        this.error = detail || e?.error?.message || e?.message || 'Error de registro';
      }
      // Ajustes de mensajes backend específicos
  const err = this.error || '';
  if (/uppercase/i.test(err)) this.error = 'La contraseña debe tener al menos una MAYÚSCULA';
  else if (/lowercase/i.test(err)) this.error = 'La contraseña debe tener al menos una minúscula';
  else if (/digit/i.test(err)) this.error = 'La contraseña debe incluir al menos un número';
  else if (/at least 8/i.test(err)) this.error = 'La contraseña debe tener mínimo 8 caracteres';
  else if (/(already|exists)/i.test(err)) this.error = 'El email ya está registrado';
    } finally {
      this.submitting = false;
    }
  }
}
