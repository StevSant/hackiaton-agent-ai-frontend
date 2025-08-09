import { Component, input, inject, ChangeDetectionStrategy } from '@angular/core';
import { Router } from '@angular/router';
import { AgentModel } from '@core/models/agent-model';
import { SESSIONS_PORT } from '@core/tokens';
import type { SessionsPort } from '@core/ports/sessions.port';
import { ListSessionsUseCase } from '@core/use-cases/list-sessions.usecase';

@Component({
  selector: 'app-agent-card',
  imports: [],
  templateUrl: './agent-card.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AgentCard {
  agent = input.required<AgentModel>();
  protected chatRoutes = { base: { path: '/chat' } } as const;

  private readonly router = inject(Router);
  private readonly sessionsPort = inject<SessionsPort>(SESSIONS_PORT);
  private readonly listSessionsUC = new ListSessionsUseCase(this.sessionsPort);

  openChat(agentId: string) {
    // Try to open the most recent session; if none, go to new chat
    this.listSessionsUC.execute(agentId).subscribe({
      next: (sessions) => {
        const latest = (sessions || []).slice().sort((a, b) => b.created_at - a.created_at)[0];
        if (latest) {
          this.router.navigate([this.chatRoutes.base.path, agentId, 'session', latest.session_id]);
        } else {
          this.router.navigate([this.chatRoutes.base.path, agentId]);
        }
      },
      error: () => {
        // Fallback to agent chat on error
        this.router.navigate([this.chatRoutes.base.path, agentId]);
      },
    });
  }

  openAudioChat(agentId: string) {
    // Try to open the most recent session; if none, go to new audio chat
    this.listSessionsUC.execute(agentId).subscribe({
      next: (sessions: any[]) => {
        const latest = (sessions || []).slice().sort((a: any, b: any) => b.created_at - a.created_at)[0];
        if (latest) {
          this.router.navigate(['/audio', agentId, 'session', latest.session_id]);
        } else {
          this.router.navigate(['/audio', agentId]);
        }
      },
      error: () => {
        this.router.navigate(['/audio', agentId]);
      },
    });
  }
}
