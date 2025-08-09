import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import type { LoginRequest, RegisterRequest, UserProfile, LoginSuccessResponse, RegisterSuccessResponse } from '@core/models/auth';
import type { AuthPort } from '@core/ports/auth.port';
import { environment } from '@environments/environment';

@Injectable({ providedIn: 'root' })
export class AuthService implements AuthPort {
  private readonly http = inject(HttpClient);
  // Use same-origin endpoints served by SSR express server
  private readonly base = environment.baseUrl;

  async login(payload: LoginRequest): Promise<LoginSuccessResponse> {
    const url = `${this.base}/auth/login`;
    return firstValueFrom(this.http.post<LoginSuccessResponse>(url, payload));
  }

  async register(payload: RegisterRequest): Promise<RegisterSuccessResponse> {
    const url = `${this.base}/auth/register`;
  const body = { email: payload.email, password: payload.password, username: payload.username };
    return firstValueFrom(this.http.post<RegisterSuccessResponse>(url, body));
  }

  getProfile(token: string): Promise<UserProfile> {
  const url = `${this.base}/auth/me`;
    return firstValueFrom(this.http.get<UserProfile>(url, {
      headers: { Authorization: `Bearer ${token}` },
    }));
  }
}
