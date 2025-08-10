import { Injectable, type ChangeDetectorRef } from '@angular/core';
import type { StreamResponseModel, ChatMessage } from '@core/models';
import { ChatFacade } from '@app/application';
import { ConnectionStatusService, TypewriterService, ScrollManagerService, SessionsEventsService, TtsService, ChatUtilsService, MessageManagerService } from './index';
import { Location } from '@angular/common';

export type ChatPageCtx = {
  currentMessage: ChatMessage | null;
  selectedSessionId: string | null;
  streamingSessionId: string | null;
  cdr: ChangeDetectorRef;
};

@Injectable({ providedIn: 'root' })
export class ChatEventsService {
  constructor(
    private readonly chatFacade: ChatFacade,
    private readonly connectionStatus: ConnectionStatusService,
    private readonly typewriter: TypewriterService,
    private readonly scrollManager: ScrollManagerService,
    private readonly sessionsEvents: SessionsEventsService,
    private readonly location: Location,
    private readonly tts: TtsService,
    private readonly chatUtils: ChatUtilsService,
    private readonly messageManager: MessageManagerService,
  ) {}

  handleStreamData(ctx: ChatPageCtx, data: StreamResponseModel) {
    this.connectionStatus.setStatus('streaming');

    switch (data.event) {
      case 'UserMessage': {
        const sid = (data as any)?.rawMessage?.session_id;
        if (!ctx.selectedSessionId && sid) {
          queueMicrotask(() => {
            ctx.selectedSessionId = sid;
            ctx.streamingSessionId = sid;
            this.location.replaceState(`/chat/session/${sid}`);
            this.sessionsEvents.triggerRefresh();
            ctx.cdr.markForCheck();
          });
        }
        break;
      }
      case 'RunResponse':
        this.handleRunResponse(ctx, data);
        break;
      case 'RunStarted':
        this.chatFacade.addSystemMessage('🤖 El agente está procesando tu solicitud...', 'RunStarted');
        break;
      case 'RunCompleted':
        this.handleRunCompleted(ctx, data);
        break;
      case 'UpdatingMemory':
      case 'ToolCallStarted':
        this.chatFacade.setToolRunning(true);
        break;
      default:
        if (data.currentChunk) {
          this.handleRunResponse(ctx, data);
        }
    }

    this.scrollManager.scheduleScrollToBottom();
    queueMicrotask(() => ctx.cdr.detectChanges());
  }

  handleRunResponse(ctx: ChatPageCtx, data: StreamResponseModel) {
    if (!ctx.currentMessage || ctx.currentMessage.isComplete) {
      ctx.currentMessage = this.chatFacade.createBotMessage(
        data.rawMessage.run_id || this.chatUtils.generateId(),
        data.rawMessage.created_at
      );
    }

    if (data.currentChunk && ctx.currentMessage) {
      ctx.currentMessage.content = data.fullContent;
      if (!this.typewriter.isActive()) {
        this.typewriter.startTypewriter(
          ctx.currentMessage,
          () => {
            this.scrollManager.scheduleScrollToBottom();
            ctx.cdr.detectChanges();
          },
          25
        );
      }
    }

    this.enrichCurrentMessage(ctx, data);

    const raw: any = data.rawMessage;
    if (!ctx.selectedSessionId && raw?.session_id) {
      queueMicrotask(() => {
        ctx.selectedSessionId = raw.session_id;
        ctx.streamingSessionId = raw.session_id;
        this.location.replaceState(`/chat/session/${raw.session_id}`);
        this.sessionsEvents.triggerRefresh();
        ctx.cdr.markForCheck();
      });
    }
  }

  enrichCurrentMessage(ctx: ChatPageCtx, data: StreamResponseModel) {
    const msg = ctx.currentMessage;
    if (!msg) return;
    if (data.currentChunk) {
      msg.content = data.fullContent;
    }
    const raw: any = data.rawMessage;
    if (raw?.extra_data?.reasoning_steps) {
      msg.extra_data = {
        ...msg.extra_data,
        reasoning_steps: raw.extra_data.reasoning_steps,
        references: msg.extra_data?.references,
      };
    }
    if (raw?.extra_data?.references) {
      msg.extra_data = {
        ...msg.extra_data,
        references: raw.extra_data.references,
        reasoning_steps: msg.extra_data?.reasoning_steps,
      };
    }
    if (raw?.images) msg.images = raw.images;
    if (raw?.videos) msg.videos = raw.videos;
  }

  handleRunCompleted(ctx: ChatPageCtx, data: StreamResponseModel) {
    const msg = ctx.currentMessage;
    if (msg) {
      const raw: any = data.rawMessage;
      if (raw?.extra_data) {
        msg.extra_data = {
          reasoning_steps: raw.extra_data.reasoning_steps ?? msg.extra_data?.reasoning_steps,
          references: raw.extra_data.references ?? msg.extra_data?.references,
        };
      }
      if (raw?.images) msg.images = raw.images;
      if (raw?.videos) msg.videos = raw.videos;

      this.typewriter.completeMessage(msg);
      if (msg.content.trim()) {
        setTimeout(() => this.tts.play(msg.content, (msg as any).id), 500);
      }
    }

    this.chatFacade.setToolRunning(false);
    this.scrollManager.scheduleScrollToBottom();
    queueMicrotask(() => {
      ctx.cdr.detectChanges();
      ctx.streamingSessionId = null;
      this.sessionsEvents.triggerRefresh();
      ctx.cdr.markForCheck();
    });
  }

  handleError(ctx: ChatPageCtx, error: any) {
    console.error('❌ Error en el stream:', error);
    this.connectionStatus.setStatus('error');
    this.typewriter.stopTypewriter();
    this.chatFacade.setIsSending(false);
    this.chatFacade.setToolRunning(false);

    if (ctx.currentMessage) {
      this.messageManager.completeMessage(ctx.currentMessage);
    }
    const errorMessage = error?.message || 'Error desconocido en la conexión';
    this.chatFacade.addErrorMessage(`❌ Error: ${errorMessage}`);
    this.scrollManager.scheduleScrollToBottom();
    ctx.cdr.detectChanges();
  }

  handleComplete(ctx: ChatPageCtx) {
    console.log('✅ Stream completado');
    this.connectionStatus.setStatus('idle');
    this.typewriter.stopTypewriter();
    this.chatFacade.setIsSending(false);
    this.chatFacade.setToolRunning(false);

    if (ctx.currentMessage) {
      this.messageManager.completeMessage(ctx.currentMessage);
    }
    queueMicrotask(() => ctx.cdr.detectChanges());
    if (ctx.selectedSessionId) {
      queueMicrotask(() => this.sessionsEvents.triggerRefresh());
    }
  }
}
