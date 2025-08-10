import { Injectable, inject } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';

const STORAGE_KEY = 'app_lang';

@Injectable({ providedIn: 'root' })
export class LanguageService {
  private readonly translate = inject(TranslateService);
  private readonly supported = ['es', 'en'] as const;
  private lastLang: 'es' | 'en' = 'es';

  init() {
  this.translate.addLangs(this.supported as unknown as string[]);
  // Default handled by use(); setDefaultLang avoided (deprecated)
  const saved = this.safeLocalStorageGet(STORAGE_KEY)?.toLowerCase() || '';
  const browser = this.safeNavigatorLang();
  let lang: 'es' | 'en' = 'es';
  if (this.isSupported(saved)) lang = saved;
  else if (this.isSupported(browser)) lang = browser;
  this.lastLang = lang;
  this.translate.use(lang);
  }

  // Promise-based init for APP_INITIALIZER; waits for translation file load
  async initApp(): Promise<void> {
    this.translate.addLangs(this.supported as unknown as string[]);
  // Default handled by use(); setDefaultLang avoided (deprecated)
    const saved = this.safeLocalStorageGet(STORAGE_KEY)?.toLowerCase() || '';
    const browser = this.safeNavigatorLang();
    let lang: 'es' | 'en' = 'es';
    if (this.isSupported(saved)) lang = saved;
    else if (this.isSupported(browser)) lang = browser;
    this.lastLang = lang;
    await firstValueFrom(this.translate.use(lang));
  }

  current(): string {
    return this.lastLang;
  }

  switch(lang: string) {
    if (!this.isSupported(lang)) return;
  this.lastLang = lang as any;
  this.translate.use(this.lastLang);
    this.safeLocalStorageSet(STORAGE_KEY, lang);
  }

  private isSupported(l: string): l is 'es' | 'en' {
    return (this.supported as readonly string[]).includes(l);
  }

  private safeNavigatorLang(): string {
    try {
      if (typeof navigator !== 'undefined' && navigator?.language) {
        return navigator.language.split('-')[0];
      }
    } catch {}
    return 'es';
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
}
