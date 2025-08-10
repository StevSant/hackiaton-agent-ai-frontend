import {
  Component,
  inject,
  ChangeDetectorRef,
  type ElementRef,
  ViewChild,
  type AfterViewChecked,
  type OnDestroy,
  type OnInit,
} from '@angular/core';
import { ChangeDetectionStrategy } from '@angular/core';
import { FormBuilder, Validators, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { CommonModule, Location } from '@angular/common';
import type { Subscription } from 'rxjs';
import type { ChatMessage } from '@core/models/chat-model';
import type { EventType } from '@core/models';
import { type StreamResponse as InfraStreamResponse } from '@infrastructure/services/sse-service';
import type { StreamResponseModel } from '@core/models';
import { ActivatedRoute, Router } from '@angular/router';

// Servicios de utilidades
import { ChatUtilsService } from '@infrastructure/services/chat-utils.service';
import { ConnectionStatusService } from '@infrastructure/services/connection-status.service';
import { TypewriterService } from '@infrastructure/services/typewriter.service';
import { ScrollManagerService } from '@infrastructure/services/scroll-manager.service';
import { MessageManagerService } from '@infrastructure/services/message-manager.service';
// Sidebar is now provided globally in Shell layout
import { ChatFacade } from '@app/application/chat/chat.facade';
import { adaptChatEntriesToMessages } from '@core/adapters/chat-adapter';
import type { SessionEntry } from '@core/models';
import { MarkdownModule } from 'ngx-markdown';
import { TranslateModule } from '@ngx-translate/core';
import type { UploadedFileMeta } from '@core/ports';
import { SessionsEventsService } from '@infrastructure/services/sessions-events.service';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    FormsModule,
  CommonModule,
  MarkdownModule,
  TranslateModule,
  MatIconModule,
  ],
  providers: [],
  templateUrl: './chat.html',
  styleUrls: ['./chat.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Chat implements OnDestroy, AfterViewChecked, OnInit {
  @ViewChild('messagesContainer', { static: false })
  private readonly messagesContainer!: ElementRef;

  // Configuración
  // No agent selection required anymore
  private readonly typewriterSpeed = 25;

  // Estado reactivo
  messages: ChatMessage[] = [];
  currentMessage: ChatMessage | null = null;
  isSending = false;
  debugMode = false;
  sessions: SessionEntry[] = [];
  selectedSessionId: string | null = null;
  filesToUpload: File[] = [];
  uploadedFiles: UploadedFileMeta[] = [];
  toolRunning = false;
  private streamingSessionId: string | null = null;
  // UI: show floating scroll-to-bottom button when user is far from bottom
  showScrollToBottom = false;

  // TTS state
  tts = {
    currentUtterance: null as SpeechSynthesisUtterance | null,
    currentMessageId: null as string | null,
    isSpeaking: false,
    isPaused: false,
    volume: 0.9,
    rate: 0.9,
    pitch: 1,
    lang: 'es-ES',
  };

  // Servicios
  private readonly chatFacade = inject(ChatFacade);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly location = inject(Location);

  // Servicios de utilidades
  protected chatUtils = inject(ChatUtilsService);
  protected connectionStatus = inject(ConnectionStatusService);
  private readonly typewriter = inject(TypewriterService);
  private readonly scrollManager = inject(ScrollManagerService);
  private readonly messageManager = inject(MessageManagerService);
  private readonly sessionsEvents = inject(SessionsEventsService);

  // Subscripciones
  private subscription: Subscription | null = null;
  typewriterSubscription: Subscription | null = null;

  // Formulario
  msgForm = this.fb.group({
    message: [
      '',
      [
        Validators.required,
        Validators.minLength(1),
        Validators.maxLength(1000),
      ],
    ],
  });

  constructor() {}
  // Helper to defer change-producing actions to next microtask
  private defer(fn: () => void) { queueMicrotask(fn); }
  ngOnInit() {
    // Carga inmediata basada en snapshot para refrescos directos
    const snapSession = this.route.snapshot.paramMap.get('sessionId')
      || this.route.snapshot.queryParamMap.get('session');
    if (snapSession) {
      this.selectedSessionId = snapSession;
      this.cdr.markForCheck();
      // Cargar inmediatamente sin defer para F5
      this.loadSession(snapSession);
    }
    // Emitir refresh para que el sidebar cargue sesiones tras F5
    this.defer(() => this.sessionsEvents.triggerRefresh());

    // React to either /chat/session/:sessionId or legacy query param
    this.route.paramMap.subscribe((p) => {
      const paramSession = p.get('sessionId');
      if (paramSession) {
        // Solo actualizar si es diferente al actual
        if (this.selectedSessionId !== paramSession) {
          this.selectedSessionId = paramSession;
          this.cdr.markForCheck();
          // Si estamos en medio de un stream y este sessionId acaba de ser creado, no cargamos aún para no abortar SSE
          if (this.isSending && this.streamingSessionId === paramSession) {
            return;
          }
          this.loadSession(paramSession);
          this.defer(() => this.sessionsEvents.triggerRefresh());
        }
        return;
      }
      // Fallback to query param for backward compatibility
      this.route.queryParamMap.subscribe((params) => {
        const sessionId = params.get('session');
        if (this.selectedSessionId !== sessionId) {
          this.selectedSessionId = sessionId;
          this.cdr.markForCheck();
          if (sessionId) {
            this.loadSession(sessionId);
            this.defer(() => this.sessionsEvents.triggerRefresh());
          } else {
            // new chat view: clear current messages if coming from a session
            this.messageManager.clearMessages(this.messages);
            this.currentMessage = null;
            this.cdr.detectChanges();
            this.defer(() => this.sessionsEvents.triggerRefresh());
          }
        }
      });
    });
  }

  agentIdValue(): string {
    // Backend ignores agent; return a constant placeholder
    return 'default';
  }

  ngAfterViewChecked() {
    this.scrollManager.executeScheduledScroll(this.messagesContainer);
  }

  // Called on messages container scroll
  onMessagesScroll() {
    try {
      const el = this.messagesContainer?.nativeElement as HTMLElement | undefined;
      if (!el) return;
      const threshold = 120; // px from bottom to consider "at bottom"
      const distanceFromBottom = el.scrollHeight - (el.scrollTop + el.clientHeight);
      const shouldShow = distanceFromBottom > threshold;
      if (shouldShow !== this.showScrollToBottom) {
        this.showScrollToBottom = shouldShow;
        this.cdr.markForCheck();
      }
    } catch {}
  }

  scrollToBottom() {
    this.scrollManager.scrollToBottom(this.messagesContainer);
    this.showScrollToBottom = false;
    this.cdr.markForCheck();
  }

  loadSessions() {
  this.chatFacade.listSessions().subscribe((data: SessionEntry[]) => {
      this.sessions = data || [];
      this.cdr.markForCheck();
    });
  }

  loadSession(sessionId: string | null, attempt: number = 0) {
    this.selectedSessionId = sessionId;
    if (!sessionId) return;
    
    console.log(`🔄 Cargando sesión: ${sessionId} (intento ${attempt + 1})`);
    
    // Reset current streaming and UI state before loading session
    this.cleanup();
    this.isSending = false;
    this.toolRunning = false;
    this.connectionStatus.setStatus('idle');
    this.currentMessage = null;

  this.chatFacade.getSession(sessionId).subscribe({
      next: (data) => {
        console.log(`✅ Sesión cargada exitosamente: ${sessionId}`, data);
        const d: any = data as any;
        const chats = d?.chats ?? d?.session?.chats ?? (Array.isArray(d) ? d : []);
        this.messages = adaptChatEntriesToMessages(chats);
        
        console.log(`📝 Mensajes cargados: ${this.messages.length}`);
        
        // Forzar múltiples ciclos de detección para asegurar renderizado
        this.cdr.markForCheck();
        this.cdr.detectChanges();
        
        // Programar scroll después del renderizado
        setTimeout(() => {
          this.scrollManager.scheduleScrollToBottom();
          this.cdr.detectChanges();
        }, 100);
        
        // Una detección adicional para casos edge
        this.defer(() => {
          this.cdr.detectChanges();
          this.scrollManager.scheduleScrollToBottom();
        });
      },
      error: (err) => {
        console.error(`❌ Error cargando sesión ${sessionId}:`, err);
        // Si es 404 no reintentar (aún no existe o se borró)
        const status = (err && (err.status ?? err.code)) as number | undefined;
        const isNotFound = status === 404;
        if (!isNotFound && attempt < 3) {
          const delays = [300, 800, 1500];
          const delay = delays[Math.min(attempt, delays.length - 1)];
          console.warn(`🔄 Reintentando cargar sesión en ${delay}ms (intento ${attempt + 1})...`);
          setTimeout(() => this.loadSession(sessionId, attempt + 1), delay);
          return;
        }
        // Manejar 404 sin romper la vista o agotados los intentos
        console.warn(`⚠️ No se pudo cargar la sesión después de ${attempt + 1} intentos`);
        // Limpiar mensajes en caso de error para evitar mostrar contenido de otra sesión
        this.messages = [];
        this.cdr.detectChanges();
      },
    });
  }

  sendMessage() {
    const messageContent = this.msgForm.get('message')?.value?.trim();
    const hasFiles = this.filesToUpload.length > 0;
    if ((!messageContent && !hasFiles) || this.isSending) {
      return;
    }
    this.startNewConversation(messageContent || '');
    this.msgForm.reset();
  }

  private async startNewConversation(content: string) {
    console.log('🚀 Iniciando nueva conversación:', content);

    // Limpiar estado anterior
    this.cleanup();
    // Si no hay sesión seleccionada, es un chat nuevo, limpiamos historial
    if (!this.selectedSessionId) {
      this.messageManager.clearMessages(this.messages);
    }
    this.currentMessage = null;
    this.isSending = true;
    this.connectionStatus.setStatus('connecting');

    // Agregar mensaje del usuario
    this.messageManager.addUserMessage(this.messages, content);
    this.scrollManager.scheduleScrollToBottom();
    this.cdr.detectChanges();

    // Iniciar stream
  // If there are files selected, upload them first to get file_ids
    let fileIds: string[] = [];
    if (this.filesToUpload.length > 0) {
      try {
        const uploaded: UploadedFileMeta[] = await this.chatFacade.uploadFiles(this.filesToUpload);
        this.uploadedFiles = uploaded;
        fileIds = uploaded.map(u => u.id);
      } catch (e) {
        console.error('Error subiendo archivos:', e);
      }
    }

    const payload: {
      message?: string;
      session_id?: string;
      user_id?: string;
      audioFile?: File;
      files?: File[];
      file_ids?: string[];
    } = {
      message: content,
      session_id: this.selectedSessionId ?? undefined,
      user_id: undefined,
      files: this.filesToUpload.length ? this.filesToUpload : undefined,
      file_ids: fileIds,
    };
    this.subscription = this.chatFacade
      .sendMessage(payload)
      .subscribe({
        next: (data: StreamResponseModel | InfraStreamResponse) =>
          this.handleStreamData(data as any),
        error: (error) => this.handleError(error),
        complete: () => this.handleComplete(),
      });
  }

  private handleStreamData(data: StreamResponseModel) {
    console.log('📨 Procesando datos del stream:', data);
    this.connectionStatus.setStatus('streaming');

    switch (data.event) {
      case 'UserMessage': {
        // As soon as backend confirms/creates session, reflect it in URL and refresh sidebar
        const sid = (data as any)?.rawMessage?.session_id;
        if (!this.selectedSessionId && sid) {
          this.defer(() => {
            this.selectedSessionId = sid;
            this.streamingSessionId = sid;
            this.location.replaceState(`/chat/session/${sid}`);
            this.sessionsEvents.triggerRefresh();
            this.cdr.markForCheck();
          });
        }
        break;
      }
      case 'RunResponse':
        this.handleRunResponse(data);
        break;
      case 'RunStarted':
        this.messageManager.addSystemMessage(
          this.messages,
          '🤖 El agente está procesando tu solicitud...',
          'RunStarted'
        );
        break;
      case 'RunCompleted':
        this.handleRunCompleted(data);
        break;
      case 'UpdatingMemory':
        this.toolRunning = true;
        break;
      case 'ToolCallStarted':
        this.toolRunning = true;
        break;
      default:
        console.log('ℹ️ Evento no manejado:', data.event, data);
        if (data.currentChunk) {
          this.handleRunResponse(data);
        }
    }

  this.scrollManager.scheduleScrollToBottom();
  this.defer(() => this.cdr.detectChanges());
  }

  private handleRunResponse(data: StreamResponseModel) {
    console.log('🤖 Respuesta del run:', data);

    // Crear nuevo mensaje si no existe o el actual está completo
    if (!this.currentMessage || this.currentMessage.isComplete) {
      this.currentMessage = this.messageManager.createBotMessage(
        this.messages,
        data.rawMessage.run_id || this.chatUtils.generateId(),
        data.rawMessage.created_at
      );
    }

    // Acumular contenido
    if (data.currentChunk && this.currentMessage) {
      this.currentMessage.content = data.fullContent;
      console.log('📝 Contenido acumulado:', this.currentMessage.content);

      // Iniciar efecto typewriter si no está activo
      if (!this.typewriter.isActive()) {
        this.typewriter.startTypewriter(
          this.currentMessage,
          () => {
            this.scrollManager.scheduleScrollToBottom();
            this.cdr.detectChanges();
          },
          this.typewriterSpeed
        );
      }
    }
    if (this.currentMessage) this.enrichCurrentMessage(data);

    // If we didn't have a session yet, as soon as the API returns a session_id, reflect it in URL
    const raw: any = data.rawMessage;
    if (!this.selectedSessionId && raw?.session_id) {
      this.defer(() => {
        this.selectedSessionId = raw.session_id;
        this.streamingSessionId = raw.session_id;
        // Update the URL without reloading component
        this.location.replaceState(`/chat/session/${raw.session_id}`);
        this.sessionsEvents.triggerRefresh();
        this.cdr.markForCheck();
      });
    }
  }

  private enrichCurrentMessage(data: StreamResponseModel) {
    if (!this.currentMessage) return;
    if (data.currentChunk) {
      this.currentMessage.content = data.fullContent;
    }
    const raw: any = data.rawMessage;
    if (raw?.extra_data?.reasoning_steps) {
      this.currentMessage.extra_data = {
        ...this.currentMessage.extra_data,
        reasoning_steps: raw.extra_data.reasoning_steps,
        references: this.currentMessage.extra_data?.references,
      };
    }
    if (raw?.extra_data?.references) {
      this.currentMessage.extra_data = {
        ...this.currentMessage.extra_data,
        references: raw.extra_data.references,
        reasoning_steps: this.currentMessage.extra_data?.reasoning_steps,
      };
    }
    if (raw?.images) this.currentMessage.images = raw.images;
    if (raw?.videos) this.currentMessage.videos = raw.videos;
    // Audio handling removed - using TTS instead
  }

  private handleRunCompleted(data: StreamResponseModel) {
    console.log('✅ Ejecución completada:', data);

    if (this.currentMessage) {
      const raw: any = data.rawMessage;
      if (raw?.extra_data) {
        this.currentMessage.extra_data = {
          reasoning_steps:
            raw.extra_data.reasoning_steps ??
            this.currentMessage.extra_data?.reasoning_steps,
          references:
            raw.extra_data.references ??
            this.currentMessage.extra_data?.references,
        };
      }
      if (raw?.images) this.currentMessage.images = raw.images;
      if (raw?.videos) this.currentMessage.videos = raw.videos;
      // Audio handling removed - using TTS instead
    }

    if (this.currentMessage) {
      this.typewriter.completeMessage(this.currentMessage);
      
      // Trigger TTS for the final response
      if (this.currentMessage.content.trim()) {
        setTimeout(() => {
          this.playAgentResponse(this.currentMessage!.content, (this.currentMessage as any).id);
        }, 500);
      }
    }

    this.toolRunning = false;
    this.scrollManager.scheduleScrollToBottom();
    this.defer(() => {
      this.cdr.detectChanges();
      // Ya terminó el stream; si teníamos sessionId en curso, liberamos bandera
      this.streamingSessionId = null;
      // Ensure sidebar reflects new/updated session
      this.sessionsEvents.triggerRefresh();
      this.cdr.markForCheck();
    });
  }

  private handleError(error: any) {
    console.error('❌ Error en el stream:', error);
    this.connectionStatus.setStatus('error');
    this.typewriter.stopTypewriter();
    this.isSending = false;
    this.toolRunning = false;

    // Finalizar mensaje actual si existe
    if (this.currentMessage) {
      this.messageManager.completeMessage(this.currentMessage);
    }

    // Mostrar mensaje de error
    const errorMessage = error.message || 'Error desconocido en la conexión';
    this.messageManager.addErrorMessage(
      this.messages,
      `❌ Error: ${errorMessage}`
    );

    this.scrollManager.scheduleScrollToBottom();
    this.cdr.detectChanges();
  }

  private handleComplete() {
    console.log('✅ Stream completado');
    this.connectionStatus.setStatus('idle');
    this.typewriter.stopTypewriter();
    this.isSending = false;
    this.toolRunning = false;

    // Asegurar que el último mensaje se muestre completamente
    if (this.currentMessage) {
      this.messageManager.completeMessage(this.currentMessage);
    }

    this.defer(() => this.cdr.detectChanges());
    // In case completion arrived without RunCompleted
    if (this.selectedSessionId) {
      this.defer(() => this.sessionsEvents.triggerRefresh());
    }
  }

  // Add TTS functionality for agent responses with controls
  playAgentResponse(text: string, messageId?: string | null) {
    try {
      if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

      // Stop any current playback
      if (this.tts.isSpeaking || this.tts.isPaused) {
        window.speechSynthesis.cancel();
      }

      const utter = new SpeechSynthesisUtterance(text);
      utter.lang = this.tts.lang;
      utter.rate = this.tts.rate;
      utter.pitch = this.tts.pitch;
      utter.volume = this.tts.volume;

      // Set UI state immediately for responsiveness
      this.tts.currentUtterance = utter;
      this.tts.currentMessageId = messageId ?? null;
      this.tts.isSpeaking = true;
      this.tts.isPaused = false;
      this.cdr.markForCheck();

      utter.onstart = () => {
        this.cdr.markForCheck();
      };
      utter.onpause = () => {
        this.tts.isPaused = true;
        this.cdr.markForCheck();
      };
      utter.onresume = () => {
        this.tts.isPaused = false;
        this.cdr.markForCheck();
      };
      const onFinish = () => {
        this.tts.currentUtterance = null;
        this.tts.isSpeaking = false;
        this.tts.isPaused = false;
        this.tts.currentMessageId = null;
        this.cdr.markForCheck();
      };
      utter.onend = onFinish;
      utter.onerror = onFinish;

      window.speechSynthesis.speak(utter);
    } catch {}
  }

  ttsPause() {
    try {
      if (typeof window === 'undefined') return;
      if (this.tts.isSpeaking && !this.tts.isPaused) {
        window.speechSynthesis.pause();
        this.tts.isPaused = true;
        this.cdr.markForCheck();
      }
    } catch {}
  }

  ttsResume() {
    try {
      if (typeof window === 'undefined') return;
      if (this.tts.isPaused) {
        window.speechSynthesis.resume();
        this.tts.isPaused = false;
        this.cdr.markForCheck();
      }
    } catch {}
  }

  ttsStop() {
    try {
      if (typeof window === 'undefined') return;
      window.speechSynthesis.cancel();
      this.tts.currentUtterance = null;
      this.tts.isSpeaking = false;
      this.tts.isPaused = false;
      this.tts.currentMessageId = null;
      this.cdr.markForCheck();
    } catch {}
  }

  // Volume change: apply to next playback; if currently speaking, optionally restart
  setTtsVolume(val: number, restartCurrent = false) {
    this.tts.volume = Math.max(0, Math.min(1, val));
    if (restartCurrent && this.tts.isSpeaking && this.tts.currentMessageId) {
      const current = this.messages.find((m: any) => m.id === this.tts.currentMessageId);
      if (current?.content?.trim()) {
        this.playAgentResponse(current.content, current.id);
      }
    }
    // If an utterance exists, update property for any queueing that remains
    if (this.tts.currentUtterance) {
      this.tts.currentUtterance.volume = this.tts.volume;
    }
    this.cdr.markForCheck();
  }

  isPlayingFor(messageId: string) {
    return this.tts.isSpeaking && this.tts.currentMessageId === messageId;
  }

  isPausedFor(messageId: string) {
    return this.tts.isPaused && this.tts.currentMessageId === messageId;
  }

  onVolumeInput(event: Event) {
    const input = event.target as HTMLInputElement;
    const v = parseFloat(input.value || '0');
    this.setTtsVolume(v, false);
  }

  onVolumeCommit(event: Event) {
    const input = event.target as HTMLInputElement;
    const v = parseFloat(input.value || '0');
    // Restart playback with new volume if currently speaking
    this.setTtsVolume(v, true);
  }

  private cleanup() {
    if (this.subscription) {
      this.subscription.unsubscribe();
      this.subscription = null;
    }
    this.typewriter.stopTypewriter();
  }

  // Métodos para el template (delegados a servicios)
  trackByMessageId = this.chatUtils.trackByMessageId.bind(this.chatUtils);
  getEventLabel = this.chatUtils.getEventLabel.bind(this.chatUtils);
  formatTimestamp = this.chatUtils.formatTimestamp.bind(this.chatUtils);
  isUserMessage = this.chatUtils.isUserMessage.bind(this.chatUtils);
  isSystemMessage = this.chatUtils.isSystemMessage.bind(this.chatUtils);
  isBotMessage = this.chatUtils.isBotMessage.bind(this.chatUtils);
  isErrorMessage = this.chatUtils.isErrorMessage.bind(this.chatUtils);

  getConnectionStatusText = this.connectionStatus.getStatusText.bind(
    this.connectionStatus
  );
  getConnectionStatusClass = this.connectionStatus.getStatusClass.bind(
    this.connectionStatus
  );

  handleKeyDown(event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  handleComposerInput(e: Event) {
    const ta = e.target as HTMLTextAreaElement | null;
    if (!ta) return;
    ta.style.height = 'auto';
    const max = 160; // px
    ta.style.height = Math.min(max, ta.scrollHeight) + 'px';
  }

  cancelSending() {
    this.cleanup();
  this.chatFacade.cancel();
    this.isSending = false;
    this.toolRunning = false;
    this.connectionStatus.setStatus('idle');
    this.messageManager.addSystemMessage(
      this.messages,
      '🚫 Envío cancelado por el usuario',
      'Cancelled' as EventType
    );
  }

  onFilesSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.filesToUpload = Array.from(input.files);
    } else {
      this.filesToUpload = [];
    }
  }

  ngOnDestroy() {
    this.cleanup();
    this.connectionStatus.destroy();
  }
}
