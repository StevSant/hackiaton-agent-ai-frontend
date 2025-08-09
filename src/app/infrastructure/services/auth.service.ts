import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import type { AuthResponse, LoginRequest, RegisterRequest, UserProfile } from '@core/models/auth';
import type { AuthPort } from '@core/ports/auth.port';
import { environment } from '@environments/environment';

@Injectable({ providedIn: 'root' })
export class AuthService implements AuthPort {
  private readonly http = inject(HttpClient);
  // Use same-origin endpoints served by SSR express server
  private readonly base = environment.baseUrl;

  login(payload: LoginRequest): Promise<AuthResponse> {
  const url = `${this.base}/auth/login`;
    return firstValueFrom(this.http.post<AuthResponse>(url, payload));
  }

  register(payload: RegisterRequest): Promise<AuthResponse> {
  const url = `${this.base}/auth/register`;
    return firstValueFrom(this.http.post<AuthResponse>(url, payload));
  }

  getProfile(token: string): Promise<UserProfile> {
  const url = `${this.base}/auth/me`;
    return firstValueFrom(this.http.get<UserProfile>(url, {
      headers: { Authorization: `Bearer ${token}` },
    }));
  }
}
