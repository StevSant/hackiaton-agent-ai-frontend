import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { RegisterUseCase } from '@core/use-cases/auth/register.usecase';
import { TokenStorageService } from '@infrastructure/services/token-storage.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule],
  templateUrl: './register.html',
})
export class RegisterPage {
  private fb = inject(FormBuilder);
  private registerUC = inject(RegisterUseCase);
  private token = inject(TokenStorageService);
  private router = inject(Router);

  form = this.fb.group({
    username: ['', [Validators.required, Validators.minLength(3)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });
  submitting = false;
  error: string | null = null;

  async submit() {
    if (this.form.invalid || this.submitting) return;
    this.submitting = true; this.error = null;
    try {
      const res = await this.registerUC.execute({ username: this.form.value.username!, email: this.form.value.email!, password: this.form.value.password! });
      this.token.setToken(res.token);
      this.router.navigateByUrl('/');
    } catch (e: any) {
      this.error = e?.error?.message || e?.message || 'Register failed';
    } finally {
      this.submitting = false;
    }
  }
}
