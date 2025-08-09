import { Component, Input, inject, signal, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChatButtonComponent } from '../chat-button/chat-button';
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
// Simple route config for home navigation

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, ChatButtonComponent, RouterLink, MatIconModule],
  templateUrl: './sidebar.html'
})

export class SidebarComponent {
  readonly siteRoutesConfig = { base: { url: '/' } } as const;

  @Input() agentId: string | null = null;

  private readonly sessionsPort = inject<SessionsPort>(SESSIONS_PORT);
  private readonly listSessionsUC = new ListSessionsUseCase(this.sessionsPort);
  private readonly getSessionUC = new GetSessionUseCase(this.sessionsPort);
  private readonly deleteSessionUC = new DeleteSessionUseCase(this.sessionsPort);
  readonly router = inject(Router);
  readonly token = inject(TokenStorageService);
  private readonly getProfileUC = inject(GetProfileUseCase);

  // auth/profile state
  profileEmail = signal<string | null>(null);
  profileLoading = signal(false);
  profileMenuOpen = signal(false);

  sessions: SessionEntry[] = [];
  isLoading = false;
  expanded: Record<string, boolean> = {};
  previews: Record<string, Array<{ who: string; text: string }>> = {};

  ngOnChanges() {
    this.tryLoad();
  }

  ngOnInit() {
    this.tryLoad();
  this.loadProfileIfAuthenticated();
  }

  tryLoad() {
    if (!this.agentId) return;
    this.isLoading = true;
    this.listSessionsUC.execute(this.agentId).subscribe({
  next: (list) => (this.sessions = list || []),
      error: () => {},
      complete: () => (this.isLoading = false),
    });
  }

  togglePreview(session: SessionEntry) {
    const id = session.session_id;
    this.expanded[id] = !this.expanded[id];
    if (this.expanded[id] && !this.previews[id] && this.agentId) {
      this.getSessionUC.execute(this.agentId, id).subscribe((res) => {
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
    if (!this.agentId) return;
  this.router.navigate(['/chat', this.agentId, 'session', session.session_id]).then(() => {
      // tras navegar, refrescar lista para reflejar títulos/orden si el backend los cambia
      this.tryLoad();
    });
  }

  newChat() {
    if (!this.agentId) return;
  this.router.navigate(['/chat', this.agentId]).then(() => {
      this.tryLoad();
    });
  }

  deleteSession(session: SessionEntry, event?: Event) {
    event?.stopPropagation();
    if (!this.agentId) return;
    this.deleteSessionUC.execute(this.agentId, session.session_id).subscribe({
      next: () => {
        // quitar de la lista sin esperar a otra llamada
        this.sessions = this.sessions.filter(s => s.session_id !== session.session_id);
        delete this.expanded[session.session_id];
        delete this.previews[session.session_id];
      },
      complete: () => this.tryLoad(),
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

  @HostListener('document:click')
  closeOnOutsideClick() {
    if (this.profileMenuOpen()) {
      this.profileMenuOpen.set(false);
    }
  }
}
