import { Component, ChangeDetectionStrategy, ElementRef, ViewChild, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { AdminMessagesFacade } from '@app/application/admin/admin-messages.facade';
// Types are implied via facade signals; no direct import needed here

@Component({
  selector: 'app-admin-messages',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './messages.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminMessagesPage {
  private readonly facade = inject(AdminMessagesFacade);

  sessions = this.facade.sessions;
  selected = this.facade.selected;
  selectedOwnerId = computed(() => {
    const id = this.selected();
    if (!id) return null;
    const list = this.sessions() || [];
    const found = list.find(s => s.session_id === id);
    return found?.user_id || null;
  });
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
  // messages infinite scroll
  @ViewChild('sentinel', { static: false }) sentinel?: ElementRef<HTMLDivElement>;
  private io?: IntersectionObserver;
  @ViewChild('sessionsSentinel', { static: false }) sessionsSentinel?: ElementRef<HTMLDivElement>;
  @ViewChild('sessionsContainer', { static: false }) sessionsContainer?: ElementRef<HTMLDivElement>;
  private ioSessions?: IntersectionObserver;

  ngAfterViewInit() {
    // set up intersection observer when sentinel is available
    queueMicrotask(() => this.setupIO());
  queueMicrotask(() => this.setupIOSessions());
  }

  private setupIO() {
    if (this.io) { this.io.disconnect(); this.io = undefined; }
    if (!this.sentinel) return;
    this.io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          const count = this.messages()?.length || 0;
          const total = this.msgTotal();
          if (count < total) {
            this.facade.nextMsgPage();
          }
        }
      }
    }, { root: (this.sentinel.nativeElement.parentElement as HTMLElement) || null, rootMargin: '0px 0px 200px 0px', threshold: 0.1 });
    this.io.observe(this.sentinel.nativeElement);
  }

  ngOnDestroy() { if (this.io) this.io.disconnect(); }

  private setupIOSessions() {
    if (!this.sessionsSentinel || !this.sessionsContainer) return;
    if (this.ioSessions) return;
    this.ioSessions = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          const count = this.sessions()?.length || 0;
          const total = this.total();
          if (!total || count < total) {
            this.facade.nextSessionsInfinite();
          }
        }
      }
    }, { root: this.sessionsContainer.nativeElement, rootMargin: '0px 0px 200px 0px', threshold: 0.1 });
    this.ioSessions.observe(this.sessionsSentinel.nativeElement);
  }
}
