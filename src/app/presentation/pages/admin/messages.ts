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
  // pagination and filters
  page = this.facade.page;
  limit = this.facade.limit;
  total = this.facade.total;
  msgTotal = this.facade.msgTotal;

  async ngOnInit() { await this.facade.loadSessions(); }

  async open(sessionId: string) { await this.facade.open(sessionId); }

  // sessions controls
  async nextSessionsPage() { await this.facade.nextSessionsPage(); }
  async prevSessionsPage() { await this.facade.prevSessionsPage(); }
  async applySessionsSearch(q: string) { await this.facade.applySessionsSearch(q); }
  // messages controls
  async nextMsgPage() { await this.facade.nextMsgPage(); }
}
