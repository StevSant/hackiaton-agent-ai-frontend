import { Component, inject, ChangeDetectionStrategy, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { RegisterUseCase } from '@core/use-cases/auth/register.usecase';

// Validator para complejidad de contraseña
export function passwordComplexityValidator(control: AbstractControl): ValidationErrors | null {
  const value: string = control.value || '';
  if (!value) return null;
  
  const failures: string[] = [];
  if (value.length < 8) failures.push('8+ caracteres');
  if (!/[A-Z]/.test(value)) failures.push('1 mayúscula');
  if (!/[a-z]/.test(value)) failures.push('1 minúscula');
  if (!/\d/.test(value)) failures.push('1 dígito');
  
  return failures.length ? { passwordComplexity: failures } : null;
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

  readonly form = this.fb.group({
    username: [''], // opcional
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, passwordComplexityValidator]],
  });
  
  readonly submitting = signal(false);
  readonly error = signal<string | null>(null);

  async submit() {
    if (this.form.invalid || this.submitting()) return;
    
    this.submitting.set(true);
    this.error.set(null);
    
    try {
      // Normalizar entrada
      const email = (this.form.value.email || '').trim().toLowerCase();
      const password = this.form.value.password || '';
      
      // Si el validator marca error, no llamar backend
      if (this.form.get('password')?.errors) {
        this.error.set('La contraseña no cumple los requisitos.');
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
      let errorMessage: string;
      
      if (Array.isArray(detail)) {
        errorMessage = detail.map((d: any) => d?.msg || d).join(' | ');
      } else {
        errorMessage = detail || e?.error?.message || e?.message || 'Error de registro';
      }
      
      // Ajustes de mensajes backend específicos
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
    } finally {
      this.submitting.set(false);
    }
  }
}
