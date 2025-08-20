import {
  Component,
  inject,
  ChangeDetectionStrategy,
  signal,
} from '@angular/core';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
  AbstractControl,
  ValidationErrors,
} from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { RegisterFacade } from '@app/application/auth/register.facade';
import { MatIconModule } from '@angular/material/icon';
import { TranslateModule } from '@ngx-translate/core';

// Validator para complejidad de contraseña
export function passwordComplexityValidator(
  control: AbstractControl,
): ValidationErrors | null {
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
  imports: [
    ReactiveFormsModule,
    CommonModule,
    RouterLink,
    MatIconModule,
    TranslateModule,
  ],
  templateUrl: './register.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RegisterPage {
  private readonly fb = inject(FormBuilder);
  private readonly facade = inject(RegisterFacade);
  private readonly router = inject(Router);

  readonly form = this.fb.group({
    username: ['', [Validators.required, Validators.minLength(3)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, passwordComplexityValidator]],
  });

  readonly submitting = this.facade.loading;
  readonly error = this.facade.error;
  readonly showPassword = signal(false);

  toggleShowPassword() {
    this.showPassword.update((v) => !v);
  }

  async submit() {
    if (this.form.invalid || this.submitting()) return;

    try {
      // Normalizar entrada y validar password local
      const email = (this.form.value.email || '').trim().toLowerCase();
      const username = (this.form.value.username || '').trim();
      const password = this.form.value.password || '';
      if (this.form.get('password')?.errors) {
        this.error.set('La contraseña no cumple los requisitos.');
        return;
      }
  await this.facade.register({ email, password, username });
  // After auto-login in facade, go to home directly
  this.router.navigateByUrl('/home');
    } catch {
      // error already set by facade
    }
  }
}
