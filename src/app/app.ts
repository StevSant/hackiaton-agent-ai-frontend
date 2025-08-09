import { Component, inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { GetAppInfoUseCase } from '@core/use-cases/get-app-info.usecase';
import type { AppInfo } from '@core/models/app-info';
import { LanguageService } from '@infrastructure/services/language.service';
import { ThemeService } from '@infrastructure/services/theme.service';
import { Title } from '@angular/platform-browser';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  private readonly getInfo = inject(GetAppInfoUseCase);
  private readonly lang = inject(LanguageService);
  private readonly theme = inject(ThemeService);
  private readonly title = inject(Title);
  private readonly platformId = inject(PLATFORM_ID);
  info?: AppInfo;

  async ngOnInit() {
    try {
      this.lang.init();
      this.theme.init();
      this.info = await this.getInfo.execute();
      // Update page title and favicon using app info
      const name = this.info?.site_name || 'Agente IA';
      this.title.setTitle(name);
      if (isPlatformBrowser(this.platformId)) {
        const icon = this.info?.site_icon || this.info?.site_logo || '/favicon.ico';
        this.setFavicon(icon);
      }
    } catch {}
  }

  private setFavicon(href: string) {
    try {
      const d = document;
      let found = d.querySelector("link[rel*='icon']");
      let el: HTMLLinkElement;
      if (found && found instanceof HTMLLinkElement) {
        el = found;
      } else {
        const created = d.createElement('link');
        created.setAttribute('rel', 'icon');
        d.head.appendChild(created);
        el = d.querySelector("link[rel='icon']") as HTMLLinkElement;
      }
      el.type = 'image/x-icon';
      el.href = href;
    } catch {}
  }
}
