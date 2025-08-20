import {
  Component,
  inject,
  ChangeDetectionStrategy,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { LoginFacade } from '@app/application/auth/login.facade';
import { MatIconModule } from '@angular/material/icon';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    CommonModule,
    RouterLink,
    MatIconModule,
    TranslateModule,
  ],
  templateUrl: './login.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginPage {
  private readonly fb = inject(FormBuilder);
  private readonly facade = inject(LoginFacade);
  private readonly router = inject(Router);

  readonly form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  readonly submitting = this.facade.loading;
  readonly error = this.facade.error;
  readonly showPassword = signal(false);

  toggleShowPassword() {
    this.showPassword.set(!this.showPassword());
  }

  async submit() {
    if (this.form.invalid || this.submitting()) return;
    try {
  await this.facade.login({
        email: this.form.value.email!,
        password: this.form.value.password!,
      });
      this.router.navigateByUrl('/home');
    } catch {
      // error state already handled in facade
    }
  }
}
