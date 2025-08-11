import {
  Component,
  ChangeDetectionStrategy,
  HostListener,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  Router,
  RouterLink,
  RouterOutlet,
  NavigationEnd,
} from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { TranslateModule } from '@ngx-translate/core';
import { TokenStorageService } from '@infrastructure/services/token-storage.service';
import { GetProfileUseCase } from '@core/use-cases';
import { LanguageService } from '@infrastructure/services/language.service';
import { ThemeService } from '@infrastructure/services/theme.service';
import { ProfileMenuComponent } from '../../components/profile-menu/profile-menu';

@Component({
  selector: 'app-admin-shell',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    RouterOutlet,
    MatIconModule,
    TranslateModule,
    ProfileMenuComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './admin-shell.html',
  styleUrl: './admin-shell.css',
})
export class AdminShellLayout {
  private readonly router = inject(Router);
  private readonly token = inject(TokenStorageService);
  private readonly getProfileUC = inject(GetProfileUseCase);
  private readonly lang = inject(LanguageService);
  protected readonly theme = inject(ThemeService);

  // Profile state (mirrors SidebarComponent)
  profileEmail = signal<string | null>(null);
  profileRole = signal<string | null>(null);
  profileLoading = signal(false);
  profileMenuOpen = signal(false);
  // Sidebar state
  sidebarCollapsed = signal(false);

  ngOnInit() {
    this.loadProfileIfAuthenticated();
    // Restore sidebar collapsed state from localStorage (desktop), but default-collapsed on mobile
    try {
      const saved =
        typeof window !== 'undefined'
          ? window.localStorage.getItem('adminSidebarCollapsed')
          : null;
      if (this.isMobile()) {
        this.sidebarCollapsed.set(true);
      } else if (saved != null) {
        this.sidebarCollapsed.set(saved === '1');
      }
    } catch {
      /* ignore */
    }

    // Collapse on route change for mobile to avoid sticky open menu
    this.router.events.subscribe((ev) => {
      if (ev instanceof NavigationEnd) {
        if (this.isMobile()) this.sidebarCollapsed.set(true);
      }
    });
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
      // optional: keep token, ignore errors
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

  toggleSidebar(event?: Event) {
    event?.stopPropagation();
    this.sidebarCollapsed.update((v) => !v);
    // Persist state
    try {
      typeof window !== 'undefined' &&
        window.localStorage.setItem(
          'adminSidebarCollapsed',
          this.sidebarCollapsed() ? '1' : '0',
        );
    } catch {
      /* ignore */
    }
  }

  private isMobile(): boolean {
    try {
      return typeof window !== 'undefined' && window.innerWidth < 768; // md breakpoint
    } catch {
      return false;
    }
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

  @HostListener('document:click')
  closeOnOutsideClick() {
    if (this.profileMenuOpen()) {
      this.profileMenuOpen.set(false);
    }
  }

  // Ensure proper sidebar state when switching between mobile and desktop
  @HostListener('window:resize')
  onResize() {
    const mobile = this.isMobile();
    if (mobile && !this.sidebarCollapsed()) {
      this.sidebarCollapsed.set(true);
      try {
        typeof window !== 'undefined' &&
          window.localStorage.setItem('adminSidebarCollapsed', '1');
      } catch {}
    } else if (!mobile && this.sidebarCollapsed()) {
      this.sidebarCollapsed.set(false);
      try {
        typeof window !== 'undefined' &&
          window.localStorage.setItem('adminSidebarCollapsed', '0');
      } catch {}
    }
  }
}
