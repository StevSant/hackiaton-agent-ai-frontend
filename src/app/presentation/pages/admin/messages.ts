import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminMessagesFacade } from '@app/application/admin/admin-messages.facade';
// Types are implied via facade signals; no direct import needed here

@Component({
  selector: 'app-admin-messages',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './messages.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminMessagesPage {
  private readonly facade = inject(AdminMessagesFacade);

  sessions = this.facade.sessions;
  selected = this.facade.selected;
  messages = this.facade.messages;
  loading = this.facade.loading;
  error = this.facade.error;

  async ngOnInit() { await this.facade.loadSessions(); }

  async open(sessionId: string) { await this.facade.open(sessionId); }
}
