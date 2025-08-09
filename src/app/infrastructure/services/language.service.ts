import { Injectable, inject } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

const STORAGE_KEY = 'app_lang';

@Injectable({ providedIn: 'root' })
export class LanguageService {
  private readonly translate = inject(TranslateService);
  private readonly supported = ['es', 'en'] as const;

  init() {
    this.translate.addLangs(this.supported as unknown as string[]);
    const saved = (localStorage.getItem(STORAGE_KEY) || '').toLowerCase();
    const browser = (navigator.language || 'es').split('-')[0];
    const lang = this.isSupported(saved) ? saved : this.isSupported(browser) ? browser : 'es';
    this.translate.setDefaultLang('es');
    this.translate.use(lang);
  }

  current(): string {
    return this.translate.currentLang || this.translate.defaultLang || 'es';
  }

  switch(lang: string) {
    if (!this.isSupported(lang)) return;
    this.translate.use(lang);
    localStorage.setItem(STORAGE_KEY, lang);
  }

  private isSupported(l: string): l is 'es' | 'en' {
    return (this.supported as readonly string[]).includes(l);
  }
}
