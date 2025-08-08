import { Injectable } from '@angular/core';

const KEY = 'auth_token';

@Injectable({ providedIn: 'root' })
export class TokenStorageService {
  setToken(token: string) {
    try { localStorage.setItem(KEY, token); } catch {}
  }
  getToken(): string | null {
    try { return localStorage.getItem(KEY); } catch { return null; }
  }
  clear() {
    try { localStorage.removeItem(KEY); } catch {}
  }
  isAuthenticated(): boolean {
    return !!this.getToken();
  }
}
