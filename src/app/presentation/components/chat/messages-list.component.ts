import { CommonModule } from '@angular/common';
import {
  Component,
  ElementRef,
  Input,
  ViewChild,
  inject,
  OnChanges,
  SimpleChanges,
  AfterViewInit,
  AfterViewChecked,
  ViewEncapsulation,
} from '@angular/core';
import { MarkdownModule } from 'ngx-markdown';
import { MatIconModule } from '@angular/material/icon';
import { TranslateModule } from '@ngx-translate/core';
import type { ChatMessage } from '@core/models';
import { ChatUtilsService } from '@infrastructure/services/chat-utils.service';
import { ScrollManagerService } from '@infrastructure/services/scroll-manager.service';
import { TtsService } from '@infrastructure/services/tts.service';
import { LazyChartComponent } from '@presentation/components/lazy-chart/lazy-chart.component';

@Component({
  selector: 'app-chat-messages-list',
  standalone: true,
  imports: [CommonModule, MarkdownModule, MatIconModule, TranslateModule, LazyChartComponent],
  templateUrl: './messages-list.component.html',
  styleUrls: ['./messages-list.component.css'],
  encapsulation: ViewEncapsulation.None,
})
export class ChatMessagesListComponent
  implements OnChanges, AfterViewInit, AfterViewChecked
{
  @Input() messages: ChatMessage[] = [];
  @Input() isSending = false;
  @Input() toolRunning = false;

  @ViewChild('messagesContainer', { static: false })
  private readonly messagesContainer!: ElementRef;

  showScrollToBottom = false;
  private pendingAutoScrollCheck = false;
  private viewReady = false;
  private lastCount = 0;
  private scrollTicking = false;

  // Copy status per message id (timestamp of last copy)
  private copiedAt = new Map<string, number>();

  // Cache for processed message content (main without <think> and extracted think blocks)
  private readonly processed = new Map<
    string,
  { main: string; thinks: string[]; expanded: boolean; last: string; charts: any[] }
  >();

  // Services
  private readonly scrollManager = inject(ScrollManagerService);
  protected readonly chatUtils = inject(ChatUtilsService);
  readonly tts = inject(TtsService);

  ngOnChanges(changes: SimpleChanges) {
    if (changes['messages']) {
      const cur = this.messages?.length ?? 0;
      if (cur !== this.lastCount) {
        this.lastCount = cur;
        this.pendingAutoScrollCheck = true;
      }
    }
  }

  ngAfterViewInit() {
    this.viewReady = true;
    // On first render, ensure we land at the bottom
    this.pendingAutoScrollCheck = true;
    // Try a rAF-based scroll to cover async markdown rendering
    queueMicrotask(() =>
      this.scrollManager.scrollToBottomRaf(this.messagesContainer, 5),
    );
  }

  // =============================
  // Copy helpers
  // =============================
  private idFor(msg: ChatMessage): string {
    return msg.id || String(msg.timestamp || 'unknown');
  }

  copiedRecently(msg: ChatMessage, ms = 1600): boolean {
    const id = this.idFor(msg);
    const t = this.copiedAt.get(id) || 0;
    return Date.now() - t < ms;
  }

  private markCopied(msg: ChatMessage) {
    this.copiedAt.set(this.idFor(msg), Date.now());
    // Auto-clear later to avoid unbounded growth
    setTimeout(() => {
      const id = this.idFor(msg);
      const t = this.copiedAt.get(id);
      if (t && Date.now() - t >= 1600) this.copiedAt.delete(id);
    }, 2000);
  }

  private async copyText(text: string): Promise<boolean> {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch {
      // Fallback below
    }
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', 'true');
      ta.style.position = 'absolute';
      ta.style.left = '-9999px';
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(ta);
      return ok;
    } catch {
      return false;
    }
  }

  async copyUserMessage(msg: ChatMessage) {
    const text = (msg.displayedContent || msg.content || '').trim();
    if (!text) return;
    const ok = await this.copyText(text);
    if (ok) this.markCopied(msg);
  }

  async copyAgentMarkdown(msg: ChatMessage) {
    const view = this.getProcessed(msg);
    const md = (view.main || msg.displayedContent || msg.content || '').trim();
    if (!md) return;
    const ok = await this.copyText(md);
    if (ok) this.markCopied(msg);
  }

  ngAfterViewChecked() {
    // Honor externally scheduled scrolls (kept for compatibility)
    this.scrollManager.executeScheduledScroll(this.messagesContainer);

    if (!this.viewReady || !this.messagesContainer) return;

    // If last message is streaming and user is near bottom, keep following
    const last = this.messages?.[this.messages.length - 1];
    const container = this.messagesContainer.nativeElement as HTMLElement;
    const distance =
      container.scrollHeight - (container.scrollTop + container.clientHeight);
    const nearBottom = distance <= 160;
    const isStreaming = !!last?.isStreaming;

    if (isStreaming && nearBottom) {
      this.scrollManager.scrollToBottom(this.messagesContainer);
      this.showScrollToBottom = false;
    }

    // After message list changes, auto-scroll if near bottom or on first pass
    if (this.pendingAutoScrollCheck) {
      if (nearBottom || container.scrollTop === 0) {
        this.scrollManager.scrollToBottomRaf(this.messagesContainer, 3);
        this.showScrollToBottom = false;
      }
      this.pendingAutoScrollCheck = false;
    }
  }

  onMessagesScroll() {
    if (this.scrollTicking) return;
    this.scrollTicking = true;
    requestAnimationFrame(() => {
      try {
        const el = this.messagesContainer?.nativeElement as
          | HTMLElement
          | undefined;
        if (!el) return;
        const threshold = 120;
        const distanceFromBottom =
          el.scrollHeight - (el.scrollTop + el.clientHeight);
        const shouldShow = distanceFromBottom > threshold;
        if (shouldShow !== this.showScrollToBottom) {
          this.showScrollToBottom = shouldShow;
        }
      } finally {
        this.scrollTicking = false;
      }
    });
  }

  scrollToBottom() {
    this.scrollManager.scrollToBottom(this.messagesContainer);
    this.showScrollToBottom = false;
  }

  // TTS helpers
  ttsPause() {
    this.tts.pause();
  }
  ttsResume() {
    this.tts.resume();
  }
  ttsStop() {
    this.tts.stop();
  }
  isPlayingFor(id: string) {
    return this.tts.isSpeaking() && this.tts.currentMessageId() === id;
  }
  isPausedFor(id: string) {
    return this.tts.isPaused() && this.tts.currentMessageId() === id;
  }

  // Play TTS with cleaned content (without <think> blocks)
  playTTS(message: ChatMessage) {
    console.log('🎵 playTTS called for message:', message.id);
    console.log('🎵 Original content:', message.content);
    console.log('🎵 Displayed content:', message.displayedContent);
    // Ensure we don't overlap with an ongoing utterance to avoid 'interrupted' errors
    if (this.tts.isSpeaking()) {
      this.tts.stop();
    }
    
    const processed = this.getProcessed(message);
    console.log('🎵 Processed content:', processed);
    
    let cleanContent = processed.main;
    
    // Fallback si processed.main está vacío
    if (!cleanContent || cleanContent.trim().length === 0) {
      console.log('🎵 Main content empty, using fallback');
      cleanContent = message.displayedContent || message.content || '';
      
      // Remover manualmente los <think> blocks si aún están presentes
      cleanContent = cleanContent.replace(/<think[^>]*>[\s\S]*?<\/think>/gi, '').trim();
    }
    
    // Limpiar markdown básico para TTS
    cleanContent = this.cleanTextForTTS(cleanContent);
    
    console.log('🎵 Final clean content:', cleanContent);
    console.log('🎵 Content length:', cleanContent.length);
    
    if (!cleanContent || cleanContent.trim().length === 0) {
      console.error('🎵 No content to play');
      return;
    }
    
    this.tts.play(cleanContent, message.id);
  }

  // Limpiar texto para TTS (remover markdown, HTML, etc.)
  private cleanTextForTTS(text: string): string {
    if (!text) return '';
    
    return text
      // Remover bloques de código
      .replace(/```[\s\S]*?```/g, '[código]')
      // Remover código inline
      .replace(/`([^`]+)`/g, '$1')
      // Remover enlaces markdown
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      // Remover headers markdown
      .replace(/^#{1,6}\s+/gm, '')
      // Remover énfasis
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/\*([^*]+)\*/g, '$1')
      .replace(/__([^_]+)__/g, '$1')
      .replace(/_([^_]+)_/g, '$1')
      // Remover HTML tags restantes
      .replace(/<[^>]+>/g, '')
      // Limpiar espacios múltiples
      .replace(/\s+/g, ' ')
      .trim();
  }

  onVolumeInput(event: Event) {
    const input = event.target as HTMLInputElement;
    const v = Number.parseFloat(input.value || '0');
    this.tts.setVolume(Number.isFinite(v) ? v : 0);
  }

  // Extract visible content and hidden <think> blocks from a markdown string
  private extractThinkBlocks(content: string): {
    main: string;
    thinks: string[];
    charts: any[];
  } {
    if (!content) return { main: '', thinks: [], charts: [] };
    const thinks: string[] = [];
    const charts: any[] = [];
    const re = /<think[^>]*>([\s\S]*?)<\/think>/gi;
    const chartFence = /```(?:chart|chartjs)\s*\n([\s\S]*?)\n```/gi;
    let main = content;
    let m: RegExpExecArray | null;
    while ((m = re.exec(content)) !== null) {
      const inner = (m[1] || '').trim();
      if (inner) thinks.push(inner);
    }
    main = main.replace(re, '').trim();
    // Extract chart blocks and strip from main
    let cm: RegExpExecArray | null;
    while ((cm = chartFence.exec(main)) !== null) {
      const jsonTxt = (cm[1] || '').trim();
      try {
        const cfg = JSON.parse(jsonTxt);
        if (cfg && typeof cfg === 'object' && cfg.type && cfg.data) {
          charts.push(cfg);
        }
      } catch {}
    }
    main = main.replace(chartFence, '').trim();
    return { main, thinks, charts };
  }

  // Get or (re)build processed view for a message, updating cache when content changes
  getProcessed(message: ChatMessage): {
    main: string;
    thinks: string[];
    charts: any[];
    expanded: boolean;
  } {
    const id = message.id || `${message.timestamp}-${Math.random()}`;
  const raw = message.displayedContent ?? message.content ?? '';
  const content = this.chatUtils.cleanForMarkdown(raw);
    const cached = this.processed.get(id);
    if (!cached || cached.last !== content) {
      const { main, thinks, charts } = this.extractThinkBlocks(content);
      const expanded = cached?.expanded ?? false; // keep user toggle if same message id
      const entry = { main, thinks, charts, expanded, last: content };
      this.processed.set(id, entry);
      return entry;
    }
    return {
      main: cached.main,
      thinks: cached.thinks,
      charts: (cached as any).charts || [],
      expanded: cached.expanded,
    };
  }

  toggleThink(message: ChatMessage) {
    const id = message.id || `${message.timestamp}`;
    const p = this.processed.get(id);
    if (p) {
      p.expanded = !p.expanded;
    } else {
      // initialize from current content
      const cur = this.getProcessed(message);
      const lastSanitized = this.chatUtils.cleanForMarkdown(
        message.displayedContent ?? message.content ?? ''
      );
      this.processed.set(id, {
        main: this.chatUtils.cleanForMarkdown(cur.main),
        thinks: cur.thinks.map((t) => this.chatUtils.cleanForMarkdown(t)),
  charts: cur.charts,
        expanded: !cur.expanded,
        last: lastSanitized,
      });
    }
  }
}
