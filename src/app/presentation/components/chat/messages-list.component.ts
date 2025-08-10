import { CommonModule } from '@angular/common';
import { Component, ElementRef, Input, ViewChild, inject } from '@angular/core';
import { MarkdownModule } from 'ngx-markdown';
import { MatIconModule } from '@angular/material/icon';
import { TranslateModule } from '@ngx-translate/core';
import type { ChatMessage } from '@core/models';
import { ChatUtilsService } from '@infrastructure/services/chat-utils.service';
import { ScrollManagerService } from '@infrastructure/services/scroll-manager.service';
import { TtsService } from '@infrastructure/services/tts.service';

@Component({
  selector: 'app-chat-messages-list',
  standalone: true,
  imports: [CommonModule, MarkdownModule, MatIconModule, TranslateModule],
  templateUrl: './messages-list.component.html',
  styleUrls: ['./messages-list.component.css']
})
export class ChatMessagesListComponent {
  @Input() messages: ChatMessage[] = [];
  @Input() isSending = false;
  @Input() toolRunning = false;

  @ViewChild('messagesContainer', { static: false })
  private readonly messagesContainer!: ElementRef;

  showScrollToBottom = false;

  // Services
  private readonly scrollManager = inject(ScrollManagerService);
  protected readonly chatUtils = inject(ChatUtilsService);
  readonly tts = inject(TtsService);

  ngAfterViewChecked() {
    this.scrollManager.executeScheduledScroll(this.messagesContainer);
  }

  onMessagesScroll() {
    try {
      const el = this.messagesContainer?.nativeElement as HTMLElement | undefined;
      if (!el) return;
      const threshold = 120;
      const distanceFromBottom = el.scrollHeight - (el.scrollTop + el.clientHeight);
      const shouldShow = distanceFromBottom > threshold;
      if (shouldShow !== this.showScrollToBottom) {
        this.showScrollToBottom = shouldShow;
      }
    } catch {}
  }

  scrollToBottom() {
    this.scrollManager.scrollToBottom(this.messagesContainer);
    this.showScrollToBottom = false;
  }

  // TTS helpers
  ttsPause() { this.tts.pause(); }
  ttsResume() { this.tts.resume(); }
  ttsStop() { this.tts.stop(); }
  isPlayingFor(id: string) { return this.tts.isSpeaking() && this.tts.currentMessageId() === id; }
  isPausedFor(id: string) { return this.tts.isPaused() && this.tts.currentMessageId() === id; }

  onVolumeInput(event: Event) {
    const input = event.target as HTMLInputElement;
    const v = Number.parseFloat(input.value || '0');
    this.tts.setVolume(Number.isFinite(v) ? v : 0);
  }
}
