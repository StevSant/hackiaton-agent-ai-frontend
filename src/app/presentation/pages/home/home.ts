import { ChangeDetectionStrategy, Component, inject, signal, PLATFORM_ID } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { MatIconModule } from '@angular/material/icon';
import { ProfileMenuComponent } from '@presentation/components/profile-menu/profile-menu';
import { TokenStorageService } from '@infrastructure/services/token-storage.service';
import { GetProfileUseCase } from '@core/use-cases';
import { isPlatformBrowser } from '@angular/common';

@Component({
  selector: 'app-home-page',
  standalone: true,
  imports: [CommonModule, RouterLink, TranslateModule, MatIconModule, ProfileMenuComponent],
  templateUrl: './home.html',
  styleUrls: ['./home.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomePage {
  private readonly token = inject(TokenStorageService);
  private readonly getProfileUC = inject(GetProfileUseCase);
  private readonly platformId = inject(PLATFORM_ID);

  // Reactive role to allow SSR -> CSR update without errors
  role = signal<string | null>(null);

  constructor() {
    // Seed with any cached role (client-only storage), SSR-safe
    const cached = this.token.getRole();
    if (cached) this.role.set(cached);

    // If browser and authenticated, refresh from API for accuracy
    if (isPlatformBrowser(this.platformId) && this.token.isAuthenticated()) {
      this.getProfileUC.execute(this.token.getToken()!).then(p => {
        if (p?.role) {
          this.token.setRole(p.role);
          this.role.set(p.role);
        }
      }).catch(() => {/* ignore errors on home */});
    }
  }

  isAuth() { return this.token.isAuthenticated(); }
  isAdmin() { return this.role() === 'admin'; }
}
