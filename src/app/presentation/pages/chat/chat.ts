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
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
  FormsModule,
} from '@angular/forms';
import { CommonModule, Location } from '@angular/common';
import type { Subscription } from 'rxjs';
import type { ChatMessage, EventType } from '@core/models/chat-model';
import { type StreamResponse as InfraStreamResponse } from '@infrastructure/services/sse-service';
import type { StreamResponseModel } from '@core/models/stream';
import { ActivatedRoute, Router } from '@angular/router';

// Servicios de utilidades
import { ChatUtilsService } from '@infrastructure/services/chat-utils.service';
import { ConnectionStatusService } from '@infrastructure/services/connection-status.service';
import { TypewriterService } from '@infrastructure/services/typewriter.service';
import { ScrollManagerService } from '@infrastructure/services/scroll-manager.service';
import { MessageManagerService } from '@infrastructure/services/message-manager.service';
// Sidebar is now provided globally in Shell layout
import { CHAT_STREAM_PORT, SESSIONS_PORT } from '@core/tokens';
import type { ChatStreamPort } from '@core/ports/chat-stream.port';
import type { SessionsPort } from '@core/ports/sessions.port';
import { SendMessageUseCase } from '@core/use-cases/send-message.usecase';
import { ListSessionsUseCase } from '@core/use-cases/list-sessions.usecase';
import { GetSessionUseCase } from '@core/use-cases/get-session.usecase';
import { adaptChatEntriesToMessages } from '@core/adapters/chat-adapter';
import type { SessionEntry } from '@core/models/playground-models';
import { decodeBase64Audio } from '@infrastructure/services/audio-util';
import { MarkdownModule } from 'ngx-markdown';
import { FilesService, type UploadedFileMeta } from '@infrastructure/services/files.service';

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    FormsModule,
  CommonModule,
  MarkdownModule,
  ],
  providers: [],
  templateUrl: './chat.html',
  styleUrls: ['./chat.css'],
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
  audioFile: File | null = null;
  filesToUpload: File[] = [];
  uploadedFiles: UploadedFileMeta[] = [];
  toolRunning = false;
  private streamingSessionId: string | null = null;

  // Servicios
  private readonly chatStream = inject<ChatStreamPort>(CHAT_STREAM_PORT);
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
  private readonly filesService = inject(FilesService);
  private readonly sessionsPort = inject<SessionsPort>(SESSIONS_PORT);
  private readonly sendMessageUC = new SendMessageUseCase(this.chatStream);
  private readonly listSessionsUC = new ListSessionsUseCase(this.sessionsPort);
  private readonly getSessionUC = new GetSessionUseCase(this.sessionsPort);

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
  ngOnInit() {
    // React to either /chat/session/:sessionId or legacy query param
    this.route.paramMap.subscribe((p) => {
      const paramSession = p.get('sessionId');
      if (paramSession) {
        this.selectedSessionId = paramSession;
        // Si estamos en medio de un stream y este sessionId acaba de ser creado, no cargamos aún para no abortar SSE
        if (this.isSending && this.streamingSessionId === paramSession) {
          return;
        }
        this.loadSession(paramSession);
        return;
      }
  // Fallback to query param for backward compatibility
      this.route.queryParamMap.subscribe((params) => {
        const sessionId = params.get('session');
        this.selectedSessionId = sessionId;
        if (sessionId) {
          this.loadSession(sessionId);
        } else {
          // new chat view: clear current messages if coming from a session
          this.messageManager.clearMessages(this.messages);
          this.currentMessage = null;
          this.cdr.detectChanges();
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

  loadSessions() {
    const id = this.agentIdValue();
    this.listSessionsUC.execute(id).subscribe((data: SessionEntry[]) => {
      this.sessions = data || [];
      this.cdr.markForCheck();
    });
  }

  loadSession(sessionId: string | null) {
    const id = this.agentIdValue();
    this.selectedSessionId = sessionId;
    if (!sessionId) return;
    // Reset current streaming and UI state before loading session
    this.cleanup();
    this.isSending = false;
    this.toolRunning = false;
    this.connectionStatus.setStatus('idle');
    this.currentMessage = null;

    this.getSessionUC.execute(id, sessionId).subscribe({
      next: (data) => {
        const d: any = data as any;
        const chats = d?.chats ?? d?.session?.chats ?? (Array.isArray(d) ? d : []);
        this.messages = adaptChatEntriesToMessages(chats);
        this.cdr.detectChanges();
        this.scrollManager.scheduleScrollToBottom();
      },
      error: (err) => {
        // Manejar 404 sin romper la vista; puede que la sesión aún no esté persistida
        console.warn('No se pudo cargar la sesión aún:', err);
      },
    });
  }

  sendMessage() {
  const messageContent = this.msgForm.get('message')?.value?.trim();
  const hasAudio = !!this.audioFile;
  const hasFiles = this.filesToUpload.length > 0;
  if ((!messageContent && !hasAudio && !hasFiles) || this.isSending) {
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
        const uploaded: UploadedFileMeta[] = [];
        for (const f of this.filesToUpload) {
          const meta = await this.filesService.upload(f);
          uploaded.push(meta);
        }
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
      audioFile: this.audioFile ?? undefined,
      files: this.filesToUpload.length ? this.filesToUpload : undefined,
      file_ids: fileIds,
    };
    this.subscription = this.sendMessageUC
      .execute(this.agentIdValue(), payload)
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
    this.cdr.detectChanges();
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
      this.selectedSessionId = raw.session_id;
      this.streamingSessionId = raw.session_id;
      // Update the URL without reloading component
      this.location.replaceState(`/chat/session/${raw.session_id}`);
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
    if (raw?.audio) this.currentMessage.audio = raw.audio;
    if (raw?.response_audio?.transcript) {
      this.currentMessage.response_audio = {
        ...(this.currentMessage.response_audio || {}),
        transcript:
          (this.currentMessage.response_audio?.transcript || '') +
          raw.response_audio.transcript,
      };
    }
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
      if (raw?.response_audio)
        this.currentMessage.response_audio = raw.response_audio;
    }

    if (this.currentMessage) {
      this.typewriter.completeMessage(this.currentMessage);
    }

    this.toolRunning = false;
    this.scrollManager.scheduleScrollToBottom();
  this.cdr.detectChanges();
  // Ya terminó el stream; si teníamos sessionId en curso, liberamos bandera
  this.streamingSessionId = null;
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

    this.cdr.detectChanges();
  }

  getAudioSrc(audio: any): string | null {
    if (!audio) return null;
    if (audio.url) return audio.url;
    if (audio.base64_audio) {
      try {
        return decodeBase64Audio(
          audio.base64_audio,
          audio.mime_type || 'audio/mpeg',
          audio.sample_rate || 44100,
          audio.channels || 1
        );
      } catch {
        return null;
      }
    }
    if (audio.content) {
      try {
        return decodeBase64Audio(
          audio.content,
          audio.mime_type || 'audio/mpeg',
          audio.sample_rate || 44100,
          audio.channels || 1
        );
      } catch {
        return null;
      }
    }
    return null;
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

  cancelSending() {
    this.cleanup();
    this.sendMessageUC.cancel();
    this.isSending = false;
    this.toolRunning = false;
    this.connectionStatus.setStatus('idle');
    this.messageManager.addSystemMessage(
      this.messages,
      '🚫 Envío cancelado por el usuario',
      'Cancelled' as EventType
    );
  }

  onAudioSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.audioFile = input.files[0];
    } else {
      this.audioFile = null;
    }
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
