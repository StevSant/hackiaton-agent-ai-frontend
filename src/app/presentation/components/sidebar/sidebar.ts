import { Component, inject, signal, HostListener, ChangeDetectorRef, ChangeDetectionStrategy, Output, EventEmitter, Input, ViewChild, ElementRef } from '@angular/core';
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
import { ProfileMenuComponent } from '../profile-menu/profile-menu';
// Simple route config for home navigation

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, MatIconModule, TranslateModule, ProfileMenuComponent],
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

  // auth/profile state (kept to check admin visibility)
  profileEmail = signal<string | null>(null);
  profileRole = signal<string | null>(null);
  profileLoading = signal(false);
  profileMenuOpen = signal(false);

  sessions: SessionEntry[] = [];
  isLoading = false;
  page = 1;
  limit = 20;
  total = 0;
  hasMore = true;
  // delete confirmation state (lifted to shell via outputs)
  confirmOpen = signal(false);
  toDelete = signal<SessionEntry | null>(null);
  @Output() deleteRequested = new EventEmitter<SessionEntry>();
  @Output() deleteCancelled = new EventEmitter<void>();
  @Output() deleteConfirmed = new EventEmitter<SessionEntry>();

  // trackBy helpers
  trackBySessionId = (_: number, s: SessionEntry) => s.session_id;
  trackByIndex = (i: number) => i;

  @ViewChild('sentinel', { static: false }) sentinel?: ElementRef<HTMLDivElement>;
  @ViewChild('scrollContainer', { static: false }) scrollContainer?: ElementRef<HTMLDivElement>;
  private io?: IntersectionObserver;

  // Helpers to sanitize and sort sessions
  sanitizeTitle(title?: string | null): string {
    const t = title || '';
    // Strip <think> tags but keep inner text (even if closing tag is missing)
    // Examples:
    //   "<think>My title</think>" -> "My title"
    //   "<think>\nShort title i" (no closing) -> "Short title i"
    //   "Hello <think>note</think> world" -> "Hello note world"
    return t
      .replace(/<\/?think[^>]*>/gi, '')
      .replace(/[\s\u00A0]+/g, ' ') // collapse whitespace
      .trim();
  }
  private tsOf(s: SessionEntry): number {
    const u: any = (s as any).updated_at ?? s.updated_at ?? (s as any).updatedAt;
    const c: any = (s as any).created_at ?? s.created_at ?? (s as any).createdAt;
    const parse = (v: any) => typeof v === 'number' ? v : (typeof v === 'string' ? Date.parse(v) || 0 : 0);
    return parse(u) || parse(c) || 0;
  }
  private sortSessionsDesc(list: SessionEntry[]): SessionEntry[] {
    return [...list].sort((a, b) => this.tsOf(b) - this.tsOf(a));
  }

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
  this.chatFacade.listSessions({ page: this.page, limit: this.limit }).subscribe({
      next: (list) => {
    // sanitize titles and sort newest first
    const sanitized = (list || []).map(s => ({
      ...s,
      title: this.sanitizeTitle(s.title) || s.title
    }));
    this.sessions = this.sortSessionsDesc(sanitized);
    // total could come in a separate response in the future; fallback keeps hasMore true until we reach an empty page
    this.hasMore = (list?.length || 0) === this.limit;
        this.cdr.markForCheck();
    // setup IO after first paint
    queueMicrotask(() => this.setupIO());
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
    if (!this.hasMore) return;
    this.page += 1;
    // For now, append by calling again (SessionsService isn’t paginated yet); dedupe by id
    this.isLoading = true; this.cdr.markForCheck();
    this.chatFacade.listSessions({ page: this.page, limit: this.limit }).subscribe({
      next: (list) => {
          const map = new Map<string, SessionEntry>();
          for (const s of this.sessions) map.set(s.session_id, s);
          for (const s of (list || [])) map.set(s.session_id, s);
          const merged = Array.from(map.values()).map(s => ({
            ...s,
            title: this.sanitizeTitle(s.title) || s.title
          }));
          this.sessions = this.sortSessionsDesc(merged);
        this.hasMore = (list?.length || 0) === this.limit;
        this.cdr.markForCheck();
      },
      complete: () => { this.isLoading = false; this.cdr.markForCheck(); },
      error: () => { this.isLoading = false; this.cdr.markForCheck(); }
    });
  }

  private setupIO() {
    if (!this.sentinel || !this.scrollContainer) return;
    if (this.io) return; // create once
    this.io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          this.loadMore();
        }
      }
    }, { root: this.scrollContainer.nativeElement, rootMargin: '0px 0px 200px 0px', threshold: 0.1 });
    this.io.observe(this.sentinel.nativeElement);
  }

  ngOnDestroy() { if (this.io) this.io.disconnect(); }

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
  this.deleteRequested.emit(session);
  }

  confirmDelete() {
    const session = this.toDelete();
    if (!session) { this.confirmOpen.set(false); return; }
  this.chatFacade.deleteSession(session.session_id).subscribe({
      next: () => {
        // remove locally
        this.sessions = this.sessions.filter(s => s.session_id !== session.session_id);
        this.cdr.markForCheck();
        // redirect to new chat page
        this.router.navigate(['/chat']).then(() => setTimeout(() => this.tryLoad()));
      },
      complete: () => {
        this.confirmOpen.set(false);
        this.deleteConfirmed.emit(session);
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
  this.deleteCancelled.emit();
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

  // toggleProfileMenu now handled inside ProfileMenuComponent when used in the template
  toggleProfileMenu(event?: Event) { /* deprecated in this view */ }

  logout(event?: Event) {
    event?.stopPropagation();
    this.token.clear();
    this.profileEmail.set(null);
    this.profileRole.set(null);
    this.profileMenuOpen.set(false);
    this.router.navigateByUrl('/login');
  }

  switchLang(lang: 'es' | 'en') { this.lang.switch(lang); }

  setTheme(value: 'light' | 'dark' | 'system') { this.theme.setTheme(value); }

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
