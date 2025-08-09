import { Component, inject, ChangeDetectionStrategy, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { LoginUseCase } from '@core/use-cases/auth/login.usecase';
import { TokenStorageService } from '@infrastructure/services/token-storage.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule, RouterLink],
  templateUrl: './login.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginPage {
  private readonly fb = inject(FormBuilder);
  private readonly loginUC = inject(LoginUseCase);
  private readonly token = inject(TokenStorageService);
  private readonly router = inject(Router);

  readonly form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });
  
  readonly submitting = signal(false);
  readonly error = signal<string | null>(null);

  async submit() {
    if (this.form.invalid || this.submitting()) return;

    this.submitting.set(true);
    this.error.set(null);
    
    try {
      const res = await this.loginUC.execute({
        email: this.form.value.email!,
        password: this.form.value.password!,
      });
      this.token.setToken(res.token.access_token);
      this.router.navigateByUrl('/');
    } catch (e: any) {
      this.error.set(e?.error?.message || e?.message || 'Login failed');
    } finally {
      this.submitting.set(false);
    }
  }
}
