import { Injectable, signal } from '@angular/core';

type Theme = 'light' | 'dark' | 'system';
const STORAGE_KEY = 'app_theme';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private _theme = signal<Theme>('system');
  readonly theme = this._theme.asReadonly();
  private media: MediaQueryList | null = null;
  private mediaListener:
    | ((this: MediaQueryList, ev: MediaQueryListEvent) => any)
    | null = null;

  init() {
    const saved = this.safeLocalStorageGet(STORAGE_KEY) as Theme | null;
    const t: Theme =
      saved === 'light' || saved === 'dark' || saved === 'system'
        ? saved
        : 'system';
    this.setTheme(t);
  }

  setTheme(t: Theme) {
    this._theme.set(t);
    this.safeLocalStorageSet(STORAGE_KEY, t);
    this.applyTheme();
    this.setupSystemListener();
  }

  toggle() {
    const current = this._theme();
    const next: Theme = current === 'dark' ? 'light' : 'dark';
    this.setTheme(next);
  }

  private applyTheme() {
    const doc = this.safeDocument();
    if (!doc) return;
    const root = doc.documentElement;
    const mode = this.resolveEffectiveMode();
    root.classList.toggle('dark', mode === 'dark');
  }

  private resolveEffectiveMode(): 'light' | 'dark' {
    const t = this._theme();
    if (t === 'system') {
      return this.prefersDark() ? 'dark' : 'light';
    }
    return t;
  }

  private setupSystemListener() {
    if (typeof window === 'undefined') return;
    if (!this.media) {
      this.media = window.matchMedia('(prefers-color-scheme: dark)');
    }
    if (this.mediaListener) {
      this.media.removeEventListener?.('change', this.mediaListener);
      this.mediaListener = null;
    }
    if (this._theme() === 'system' && this.media) {
      this.mediaListener = () => this.applyTheme();
      this.media.addEventListener?.('change', this.mediaListener);
    }
  }

  private prefersDark(): boolean {
    try {
      if (typeof window !== 'undefined') {
        return (
          window.matchMedia?.('(prefers-color-scheme: dark)')?.matches ?? false
        );
      }
    } catch {}
    return false;
  }

  private safeLocalStorageGet(key: string): string | null {
    try {
      if (typeof localStorage !== 'undefined') return localStorage.getItem(key);
    } catch {}
    return null;
  }
  private safeLocalStorageSet(key: string, value: string) {
    try {
      if (typeof localStorage !== 'undefined') localStorage.setItem(key, value);
    } catch {}
  }
  private safeDocument(): Document | null {
    try {
      if (typeof document !== 'undefined') return document;
    } catch {}
    return null;
  }
}
