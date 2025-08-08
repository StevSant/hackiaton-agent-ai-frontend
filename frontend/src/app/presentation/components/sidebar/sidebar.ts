import { Component, Input, inject } from '@angular/core';
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
  private readonly router = inject(Router);

  sessions: SessionEntry[] = [];
  isLoading = false;
  expanded: Record<string, boolean> = {};
  previews: Record<string, Array<{ who: string; text: string }>> = {};

  ngOnChanges() {
    this.tryLoad();
  }

  ngOnInit() {
    this.tryLoad();
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
        const items = chats.slice(-6).flatMap((c) => [
          { who: c.message.role, text: c.message.content },
          { who: 'assistant', text: c.response?.content || '' },
        ]);
        this.previews[id] = items;
      });
    }
  }

  openSession(session: SessionEntry) {
    if (!this.agentId) return;
    this.router.navigate(['/agent', this.agentId], { queryParams: { session: session.session_id } });
  }

  newChat() {
    if (!this.agentId) return;
    this.router.navigate(['/agent', this.agentId], { queryParams: {} });
  }

  deleteSession(session: SessionEntry, event?: Event) {
    event?.stopPropagation();
    if (!this.agentId) return;
    this.deleteSessionUC.execute(this.agentId, session.session_id).subscribe(() => this.tryLoad());
  }
}
