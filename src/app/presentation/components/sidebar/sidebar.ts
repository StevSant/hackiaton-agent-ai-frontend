import { Component, inject, signal, HostListener, ChangeDetectorRef, ChangeDetectionStrategy, Output, EventEmitter, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import type { SessionEntry } from '@core/models';
import { ChatFacade } from '@app/application/chat/chat.facade';
import { TokenStorageService } from '@infrastructure/services/token-storage.service';
import { GetProfileUseCase } from '@core/use-cases';
import { SessionsEventsService } from '@infrastructure/services/sessions-events.service';
import { LanguageService } from '@infrastructure/services/language.service';
import { ThemeService } from '@infrastructure/services/theme.service';
import { TranslateModule } from '@ngx-translate/core';
// Simple route config for home navigation

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, MatIconModule, TranslateModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './sidebar.html',
  styleUrls: ['./sidebar.css']
})

export class SidebarComponent {
  @Input() isOpen = true;
  @Output() closed = new EventEmitter<void>();
  @Output() opened = new EventEmitter<void>();
  readonly siteRoutesConfig = { base: { url: '/' } } as const;

  // No agentId required anymore

  private readonly chatFacade = inject(ChatFacade);
  readonly router = inject(Router);
  readonly token = inject(TokenStorageService);
  private readonly getProfileUC = inject(GetProfileUseCase);
  private readonly sessionsEvents = inject(SessionsEventsService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly lang = inject(LanguageService);
  protected readonly theme = inject(ThemeService);

  // auth/profile state
  profileEmail = signal<string | null>(null);
  profileRole = signal<string | null>(null);
  profileLoading = signal(false);
  profileMenuOpen = signal(false);

  sessions: SessionEntry[] = [];
  isLoading = false;
  page = 1;
  limit = 20;
  total = 0;
  expanded: Record<string, boolean> = {};
  previews: Record<string, { title: string; summary?: string } | undefined> = {};
  // delete confirmation state
  confirmOpen = signal(false);
  toDelete = signal<SessionEntry | null>(null);

  // trackBy helpers
  trackBySessionId = (_: number, s: SessionEntry) => s.session_id;
  trackByIndex = (i: number) => i;

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
    this.chatFacade.listSessions().subscribe({
      next: (list) => {
        this.sessions = list || [];
        this.cdr.markForCheck();
      },
      error: () => {
        // ensure loading state is cleared so future refresh triggers work
        this.isLoading = false;
        this.cdr.markForCheck();
      },
      complete: () => setTimeout(() => { this.isLoading = false; this.cdr.markForCheck(); }),
    });
  }

  loadMore() {
    if (this.isLoading) return;
    if (this.sessions.length >= this.total && this.total > 0) return;
    this.page += 1;
    // For now, append by calling again (SessionsService isn’t paginated yet); dedupe by id
    this.isLoading = true; this.cdr.markForCheck();
    this.chatFacade.listSessions().subscribe({
      next: (list) => {
        const map = new Map<string, SessionEntry>();
        for (const s of this.sessions) map.set(s.session_id, s);
        for (const s of (list || [])) map.set(s.session_id, s);
        this.sessions = Array.from(map.values());
        this.cdr.markForCheck();
      },
      complete: () => { this.isLoading = false; this.cdr.markForCheck(); },
      error: () => { this.isLoading = false; this.cdr.markForCheck(); }
    });
  }

  togglePreview(session: SessionEntry) {
    const id = session.session_id;
    this.expanded[id] = !this.expanded[id];
    if (this.expanded[id] && !this.previews[id]) {
      // Use data already available from session listing: title and summary
      this.previews[id] = { title: session.title, summary: session.summary };
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

  openDeleteModal(session: SessionEntry, event?: Event) {
    event?.stopPropagation();
    this.toDelete.set(session);
    this.confirmOpen.set(true);
  }

  confirmDelete() {
    const session = this.toDelete();
    if (!session) { this.confirmOpen.set(false); return; }
  this.chatFacade.deleteSession(session.session_id).subscribe({
      next: () => {
        // remove locally
        this.sessions = this.sessions.filter(s => s.session_id !== session.session_id);
        delete this.expanded[session.session_id];
        delete this.previews[session.session_id];
        this.cdr.markForCheck();
        // redirect to new chat page
        this.router.navigate(['/chat']).then(() => setTimeout(() => this.tryLoad()));
      },
      complete: () => {
        this.confirmOpen.set(false);
        this.toDelete.set(null);
      },
      error: () => {
        this.confirmOpen.set(false);
        this.toDelete.set(null);
      }
    });
  }

  cancelDelete() {
    this.confirmOpen.set(false);
    this.toDelete.set(null);
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
  this.profileRole.set(profile.role || null);
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
  this.profileRole.set(null);
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
    if (this.isOpen) {
      this.closed.emit();
    }
  }
}
