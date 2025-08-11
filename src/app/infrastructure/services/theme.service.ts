// theme.service.ts
import { Injectable, signal } from '@angular/core';

type Theme = 'light' | 'dark' | 'system';
const STORAGE_KEY = 'app_theme';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private _theme = signal<Theme>('system');
  readonly theme = this._theme.asReadonly();
  private media: MediaQueryList | null = null;
  private mediaListener: ((this: MediaQueryList, ev: MediaQueryListEvent) => any) | null = null;

  init() {
    const saved = this.safeLocalStorageGet(STORAGE_KEY) as Theme | null;
    const t: Theme = saved === 'light' || saved === 'dark' || saved === 'system' ? saved : 'system';
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

  /** 'light' | 'dark' resolviendo 'system' */
  effective(): 'light' | 'dark' {
    const t = this._theme();
    if (t === 'system') return this.prefersDark() ? 'dark' : 'light';
    return t;
  }

  /** Útil en templates si quieres booleano */
  isDark(): boolean {
    return this.effective() === 'dark';
  }

  private applyTheme() {
    const doc = this.safeDocument();
    if (!doc) return;

    const root = doc.documentElement;
    const mode = this.effective();

    // 🔧 Limpia `.dark` de cualquier otro elemento (body, contenedores, etc.)
    doc.querySelectorAll('.dark').forEach(el => {
      if (el !== root) el.classList.remove('dark');
    });

    // Tailwind dark:
    root.classList.toggle('dark', mode === 'dark');

    // Para componentes que lean variables/attr
    root.setAttribute('data-theme', mode);
    root.style.colorScheme = mode;
  }

  private setupSystemListener() {
    if (typeof window === 'undefined') return;
    if (!this.media) this.media = window.matchMedia('(prefers-color-scheme: dark)');
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
      return typeof window !== 'undefined'
        ? window.matchMedia?.('(prefers-color-scheme: dark)')?.matches ?? false
        : false;
    } catch { return false; }
  }

  private safeLocalStorageGet(key: string): string | null { try { return localStorage.getItem(key); } catch { return null; } }
  private safeLocalStorageSet(key: string, value: string) { try { localStorage.setItem(key, value); } catch { } }
  private safeDocument(): Document | null { try { return document; } catch { return null; } }

}
