import { Component, inject, signal, HostListener, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import type { SessionEntry, ChatEntry } from '@core/models/playground-models';
import { SESSIONS_PORT } from '@core/tokens';
import type { SessionsPort } from '@core/ports/sessions.port';
import { ListSessionsUseCase } from '@core/use-cases/list-sessions.usecase';
import { GetSessionUseCase } from '@core/use-cases/get-session.usecase';
import { DeleteSessionUseCase } from '@core/use-cases/delete-session.usecase';
import { TokenStorageService } from '@infrastructure/services/token-storage.service';
import { GetProfileUseCase } from '@core/use-cases/auth/get-profile.usecase';
import { SessionsEventsService } from '@infrastructure/services/sessions-events.service';
import { LanguageService } from '@infrastructure/services/language.service';
import { ThemeService } from '@infrastructure/services/theme.service';
import { TranslateModule } from '@ngx-translate/core';
// Simple route config for home navigation

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, MatIconModule, TranslateModule],
  templateUrl: './sidebar.html'
})

export class SidebarComponent {
  readonly siteRoutesConfig = { base: { url: '/' } } as const;

  // No agentId required anymore

  private readonly sessionsPort = inject<SessionsPort>(SESSIONS_PORT);
  private readonly listSessionsUC = new ListSessionsUseCase(this.sessionsPort);
  private readonly getSessionUC = new GetSessionUseCase(this.sessionsPort);
  private readonly deleteSessionUC = new DeleteSessionUseCase(this.sessionsPort);
  readonly router = inject(Router);
  readonly token = inject(TokenStorageService);
  private readonly getProfileUC = inject(GetProfileUseCase);
  private readonly sessionsEvents = inject(SessionsEventsService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly lang = inject(LanguageService);
  protected readonly theme = inject(ThemeService);

  // auth/profile state
  profileEmail = signal<string | null>(null);
  profileLoading = signal(false);
  profileMenuOpen = signal(false);

  sessions: SessionEntry[] = [];
  isLoading = false;
  expanded: Record<string, boolean> = {};
  previews: Record<string, Array<{ who: string; text: string }>> = {};

  ngOnInit() {
    this.tryLoad();
    this.loadProfileIfAuthenticated();
    // refresh when someone triggers a sessions update
    this.sessionsEvents.onRefresh().subscribe(() => this.tryLoad());
  }

  tryLoad() {
    if (this.isLoading) return;
    // Defer loading flag to avoid NG0100 when toggling quickly in same tick
    setTimeout(() => { this.isLoading = true; this.cdr.markForCheck(); });
    // agentId is ignored by backend; pass a placeholder
    this.listSessionsUC.execute('default').subscribe({
      next: (list) => {
        this.sessions = list || [];
        this.cdr.markForCheck();
      },
      error: () => { /* silent */ },
      complete: () => setTimeout(() => { this.isLoading = false; this.cdr.markForCheck(); }),
    });
  }

  togglePreview(session: SessionEntry) {
    const id = session.session_id;
    this.expanded[id] = !this.expanded[id];
    if (this.expanded[id] && !this.previews[id]) {
      this.getSessionUC.execute('default', id).subscribe((res) => {
        const chats: ChatEntry[] = (res as any)?.chats || [];
        const items = chats.slice(-6).flatMap((c) => {
          const arr: Array<{ who: string; text: string }> = [
            { who: c.message.role, text: c.message.content }
          ];
          if (c.response && typeof c.response.content === 'string' && c.response.content.length > 0) {
            arr.push({ who: 'assistant', text: c.response.content });
          }
          return arr;
        });
        this.previews[id] = items;
      });
    }
  }

  openSession(session: SessionEntry) {
  this.router.navigate(['/chat', 'session', session.session_id]).then(() => {
      // tras navegar, refrescar lista para reflejar títulos/orden si el backend los cambia
  setTimeout(() => this.tryLoad());
    });
  }

  newChat() {
  this.router.navigate(['/chat']).then(() => {
  setTimeout(() => this.tryLoad());
    });
  }

  deleteSession(session: SessionEntry, event?: Event) {
    event?.stopPropagation();
  this.deleteSessionUC.execute('default', session.session_id).subscribe({
      next: () => {
        // quitar de la lista sin esperar a otra llamada
        this.sessions = this.sessions.filter(s => s.session_id !== session.session_id);
        delete this.expanded[session.session_id];
        delete this.previews[session.session_id];
        this.cdr.markForCheck();
      },
      complete: () => setTimeout(() => this.tryLoad()),
    });
  }

  isAuthenticated() { return this.token.isAuthenticated(); }

  // --- Auth / Profile dropdown logic ---
  private async loadProfileIfAuthenticated() {
    if (!this.token.isAuthenticated() || this.profileEmail()) return;
    const t = this.token.getToken();
    if (!t) return;
    this.profileLoading.set(true);
    try {
      const profile = await this.getProfileUC.execute(t);
      this.profileEmail.set(profile.email || profile.username || null);
    } catch {
      // si falla, limpiamos token para evitar estado inconsistente
      // this.token.clear(); // opcional: comentar para no forzar logout automático
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
      // intentar cargar si aún no está
      this.loadProfileIfAuthenticated();
    }
    this.profileMenuOpen.update(v => !v);
  }

  logout(event?: Event) {
    event?.stopPropagation();
    this.token.clear();
    this.profileEmail.set(null);
    this.profileMenuOpen.set(false);
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
}
