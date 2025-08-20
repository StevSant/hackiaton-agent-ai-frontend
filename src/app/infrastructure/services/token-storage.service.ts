import { Injectable } from '@angular/core';

const KEY = 'auth_token';
const KEY_ROLE = 'auth_role';
const KEY_USER = 'auth_user';

@Injectable({ providedIn: 'root' })
export class TokenStorageService {
  setToken(token: string) {
    try {
      localStorage.setItem(KEY, token);
    } catch {}
  }
  getToken(): string | null {
    try {
      return localStorage.getItem(KEY);
    } catch {
      return null;
    }
  }
  setRole(role: string) {
    try {
      localStorage.setItem(KEY_ROLE, role);
    } catch {}
  }
  getRole(): string | null {
    try {
      return localStorage.getItem(KEY_ROLE);
    } catch {
      return null;
    }
  }
  setUser(user: any) {
    try {
      localStorage.setItem(KEY_USER, JSON.stringify(user ?? null));
    } catch {}
  }
  getUser<T = any>(): T | null {
    try {
      const raw = localStorage.getItem(KEY_USER);
      return raw ? (JSON.parse(raw) as T) : null;
    } catch {
      return null;
    }
  }
  getUserId(): string | null {
    const u: any = this.getUser();
    return u?.user_id || null;
  }
  clear() {
    try {
      localStorage.removeItem(KEY);
      localStorage.removeItem(KEY_ROLE);
      localStorage.removeItem(KEY_USER);
    } catch {}
  }
  isAuthenticated(): boolean {
    return !!this.getToken();
  }
}
