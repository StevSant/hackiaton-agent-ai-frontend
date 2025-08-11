import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  HostListener,
  Input,
  Output,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { TranslateModule } from '@ngx-translate/core';
import { TokenStorageService } from '@infrastructure/services/token-storage.service';
import { GetProfileUseCase } from '@core/use-cases';
import { LanguageService } from '@infrastructure/services/language.service';
import { ThemeService } from '@infrastructure/services/theme.service';
import { BackgroundService } from '@infrastructure/services/background.service';

@Component({
  selector: 'app-profile-menu',
  standalone: true,
  imports: [CommonModule, RouterLink, MatIconModule, TranslateModule],
  templateUrl: './profile-menu.html',
  styleUrls: ['./profile-menu.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfileMenuComponent {
  // Optional: quick navigation links for shells
  @Input() showBackToChat = false;
  @Input() showBackHome = false;
  @Input() compact = false; // if true, adjust paddings/sizes

  @Output() closed = new EventEmitter<void>();

  private readonly router = inject(Router);
  private readonly token = inject(TokenStorageService);
  private readonly getProfileUC = inject(GetProfileUseCase);
  protected readonly lang = inject(LanguageService);
  protected readonly theme = inject(ThemeService);
  protected readonly bg = inject(BackgroundService);

  profileEmail = signal<string | null>(null);
  profileRole = signal<string | null>(null);
  profileLoading = signal(false);
  profileMenuOpen = signal(false);

  ngOnInit() {
    // initialize theme and background services once menu is loaded
    this.theme.init?.();
    this.bg.init();
    this.loadProfileIfAuthenticated();
  }

  isAuthenticated() {
    return this.token.isAuthenticated();
  }

  private async loadProfileIfAuthenticated() {
    if (!this.token.isAuthenticated() || this.profileEmail()) return;
    const t = this.token.getToken();
    if (!t) return;
    this.profileLoading.set(true);
    try {
      const profile = await this.getProfileUC.execute(t);
      this.profileEmail.set(profile.email || profile.username || null);
      this.profileRole.set(profile.role || null);
    } catch {
      // ignore
    } finally {
      this.profileLoading.set(false);
    }
  }

  toggleProfileMenu(event?: Event) {
    event?.stopPropagation();
    if (!this.token.isAuthenticated()) {
      this.router.navigateByUrl('/login');
      return;
    }
    if (!this.profileEmail() && !this.profileLoading()) {
      this.loadProfileIfAuthenticated();
    }
    this.profileMenuOpen.update((v) => !v);
  }

  logout(event?: Event) {
    event?.stopPropagation();
    this.token.clear();
    this.profileEmail.set(null);
    this.profileRole.set(null);
    this.profileMenuOpen.set(false);
    this.router.navigateByUrl('/login');
  }

  navigateToLogin() {
    this.router.navigateByUrl('/login');
  }

  switchLang(lang: 'es' | 'en') {
    this.lang.switch(lang);
  }
  setTheme(value: 'light' | 'dark' | 'system') {
    this.theme.setTheme(value);
  }
  setBg(style: 'minimal' | 'aurora' | 'bokeh') {
    this.bg.setBackground(style);
  }
  setPalette(p: 'default' | 'vaporwave' | 'cyber') {
    this.bg.setPalette(p);
  }
  toggleNeonEdges() {
    this.bg.setNeonEdges(!this.bg.neon());
  }
  toggleParallax() {
    this.bg.setParallax(!this.bg.parallax());
  }

  @HostListener('document:click')
  closeOnOutsideClick() {
    if (this.profileMenuOpen()) {
      this.profileMenuOpen.set(false);
      this.closed.emit();
    }
  }
}
