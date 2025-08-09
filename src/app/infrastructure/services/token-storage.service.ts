import { Injectable } from '@angular/core';

const KEY = 'auth_token';
const KEY_ROLE = 'auth_role';

@Injectable({ providedIn: 'root' })
export class TokenStorageService {
  setToken(token: string) {
    try { localStorage.setItem(KEY, token); } catch {}
  }
  getToken(): string | null {
    try { return localStorage.getItem(KEY); } catch { return null; }
  }
  setRole(role: string) {
    try { localStorage.setItem(KEY_ROLE, role); } catch {}
  }
  getRole(): string | null {
    try { return localStorage.getItem(KEY_ROLE); } catch { return null; }
  }
  clear() {
    try {
      localStorage.removeItem(KEY);
      localStorage.removeItem(KEY_ROLE);
    } catch {}
  }
  isAuthenticated(): boolean {
    return !!this.getToken();
  }
}
