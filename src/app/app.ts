import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { GetAppInfoUseCase } from '@core/use-cases/get-app-info.usecase';
import type { AppInfo } from '@core/models/app-info';
import { LanguageService } from '@infrastructure/services/language.service';
import { ThemeService } from '@infrastructure/services/theme.service';

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
  info?: AppInfo;

  async ngOnInit() {
    try {
      this.lang.init();
      this.theme.init();
      this.info = await this.getInfo.execute();
    } catch {}
  }
}
