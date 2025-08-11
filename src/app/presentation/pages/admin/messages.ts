import {
  Component,
  ChangeDetectionStrategy,
  ElementRef,
  ViewChild,
  inject,
  computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { AdminMessagesFacade } from '@app/application/admin/admin-messages.facade';
import { MarkdownModule } from 'ngx-markdown';
import { MatIconModule } from '@angular/material/icon';
// Types are implied via facade signals; no direct import needed here

@Component({
  selector: 'app-admin-messages',
  standalone: true,
  imports: [CommonModule, TranslateModule, MarkdownModule, MatIconModule],
  templateUrl: './messages.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminMessagesPage {
  private readonly facade = inject(AdminMessagesFacade);

  sessions = this.facade.sessions;
  selected = this.facade.selected;
  getCachedUserLabel = this.facade.getCachedUserLabel.bind(this.facade);
  selectedOwnerId = computed(() => {
    const id = this.selected();
    if (!id) return null;
    const list = this.sessions() || [];
    const found = list.find((s) => s.session_id === id);
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

  async ngOnInit() {
    await this.facade.loadSessions();
  }

  async open(sessionId: string) {
    await this.facade.open(sessionId);
  }

  // Resolve user details for display (email/name) with caching
  async userLabel(userId: string | null | undefined): Promise<string> {
    if (!userId) return '';
    const u = await this.facade.resolveUser(userId);
    if (!u) return userId;
    if (u.username && u.email) return `${u.username} <${u.email}>`;
    return u.email || u.username || userId;
  }

  // sessions controls
  async nextSessionsPage() {
    await this.facade.nextSessionsPage();
  }
  async prevSessionsPage() {
    await this.facade.prevSessionsPage();
  }
  async applySessionsSearch(q: string) {
    await this.facade.applySessionsSearch(q);
  }
  // messages infinite scroll
  @ViewChild('sentinel', { static: false })
  sentinel?: ElementRef<HTMLDivElement>;
  private io?: IntersectionObserver;
  @ViewChild('sessionsSentinel', { static: false })
  sessionsSentinel?: ElementRef<HTMLDivElement>;
  @ViewChild('sessionsContainer', { static: false })
  sessionsContainer?: ElementRef<HTMLDivElement>;
  private ioSessions?: IntersectionObserver;

  // Cache for processed message content (main without <think> and extracted think blocks)
  private processed = new Map<
    string,
    { main: string; thinks: string[]; expanded: boolean; last: string }
  >();

  ngAfterViewInit() {
    // set up intersection observer when sentinel is available
    queueMicrotask(() => this.setupIO());
    queueMicrotask(() => this.setupIOSessions());
  }

  private setupIO() {
    if (this.io) {
      this.io.disconnect();
      this.io = undefined;
    }
    if (!this.sentinel) return;
    this.io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            const count = this.messages()?.length || 0;
            const total = this.msgTotal();
            if (count < total) {
              this.facade.nextMsgPage();
            }
          }
        }
      },
      {
        root:
          (this.sentinel.nativeElement.parentElement as HTMLElement) || null,
        rootMargin: '0px 0px 200px 0px',
        threshold: 0.1,
      },
    );
    this.io.observe(this.sentinel.nativeElement);
  }

  ngOnDestroy() {
    if (this.io) this.io.disconnect();
  }

  private setupIOSessions() {
    if (!this.sessionsSentinel || !this.sessionsContainer) return;
    if (this.ioSessions) return;
    this.ioSessions = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            const count = this.sessions()?.length || 0;
            const total = this.total();
            if (!total || count < total) {
              this.facade.nextSessionsInfinite();
            }
          }
        }
      },
      {
        root: this.sessionsContainer.nativeElement,
        rootMargin: '0px 0px 200px 0px',
        threshold: 0.1,
      },
    );
    this.ioSessions.observe(this.sessionsSentinel.nativeElement);
  }

  // Extract visible content and hidden <think> blocks from a markdown string
  private extractThinkBlocks(content: string): {
    main: string;
    thinks: string[];
  } {
    if (!content) return { main: '', thinks: [] };
    const thinks: string[] = [];
    const re = /<think[^>]*>([\s\S]*?)<\/think>/gi;
    let main = content;
    let m: RegExpExecArray | null;
    while ((m = re.exec(content)) !== null) {
      const inner = (m[1] || '').trim();
      if (inner) thinks.push(inner);
    }
    main = main.replace(re, '').trim();
    return { main, thinks };
  }

  // Get or (re)build processed view for a message, updating cache when content changes
  getProcessed(message: { id?: string; content?: string }): {
    main: string;
    thinks: string[];
    expanded: boolean;
  } {
    const id =
      message.id ||
      `${message.content?.slice(0, 16) ?? 'msg'}-${Math.random()}`;
    const content = message.content ?? '';
    const cached = this.processed.get(id);
    if (!cached || cached.last !== content) {
      const { main, thinks } = this.extractThinkBlocks(content);
      const expanded = cached?.expanded ?? false; // preserve toggle state
      const entry = { main, thinks, expanded, last: content };
      this.processed.set(id, entry);
      return entry;
    }
    return {
      main: cached.main,
      thinks: cached.thinks,
      expanded: cached.expanded,
    };
  }

  toggleThink(message: { id?: string; content?: string }) {
    const id = message.id || `${message.content?.slice(0, 16) ?? 'msg'}`;
    const p = this.processed.get(id);
    if (p) {
      p.expanded = !p.expanded;
    } else {
      const cur = this.getProcessed(message);
      this.processed.set(id, {
        main: cur.main,
        thinks: cur.thinks,
        expanded: !cur.expanded,
        last: message.content ?? '',
      });
    }
  }
}
