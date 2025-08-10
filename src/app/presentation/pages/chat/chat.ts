import {
  Component,
  inject,
  ChangeDetectorRef,
  type OnDestroy,
  type OnInit,
} from '@angular/core';
import { ChangeDetectionStrategy } from '@angular/core';
import {
  FormBuilder,
  Validators,
  FormsModule,
  ReactiveFormsModule,
} from '@angular/forms';
import { CommonModule, Location } from '@angular/common';
import type { Subscription } from 'rxjs';
import type {
  ChatMessage,
  EventType,
  StreamResponseModel,
  SessionEntry,
} from '@core/models';
import { ActivatedRoute, Router } from '@angular/router';

// Servicios de utilidades (barrels)
import {
  ChatUtilsService,
  ConnectionStatusService,
  TypewriterService,
  ScrollManagerService,
  TtsService,
  SessionsEventsService,
  ChatEventsService,
} from '@infrastructure/services';
// Sidebar is now provided globally in Shell layout (barrel)
import { ChatFacade } from '@app/application';
import { adaptChatEntriesToMessages } from '@core/adapters';
import { MarkdownModule } from 'ngx-markdown';
import { TranslateModule } from '@ngx-translate/core';
import type { UploadedFileMeta } from '@core/ports';
import { MatIconModule } from '@angular/material/icon';
import { ChatMessagesListComponent } from '../../components/chat/messages-list.component';
import { ChatComposerComponent } from '../../components/chat/composer.component';
import { SessionFilesModalComponent } from '../../components/files/session-files-modal.component';

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
    ChatMessagesListComponent,
    ChatComposerComponent,
  SessionFilesModalComponent,
  ],
  providers: [],
  templateUrl: './chat.html',
  styleUrls: ['./chat.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Chat implements OnDestroy, OnInit {
  // Configuración
  // No agent selection required anymore
  private readonly typewriterSpeed = 25;

  // Servicios
  private readonly chatFacade = inject(ChatFacade);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly location = inject(Location);

  // Estado reactivo (delegado al facade): usar señales directamente
  readonly messages = this.chatFacade.messages;
  currentMessage: ChatMessage | null = null;
  readonly isSending = this.chatFacade.isSending;
  debugMode = false;
  sessions: SessionEntry[] = [];
  selectedSessionId: string | null = null;
  filesToUpload: File[] = [];
  uploadedFiles: UploadedFileMeta[] = [];
  isUploadingFiles = false;
  showFilesModal = false;
  readonly toolRunning = this.chatFacade.toolRunning;
  private streamingSessionId: string | null = null;
  // UI handled inside messages-list component

  // TTS state
  // TTS via service
  readonly tts = inject(TtsService);

  // (moved services up to initialize before reading signals)

  // Servicios de utilidades
  protected chatUtils = inject(ChatUtilsService);
  protected connectionStatus = inject(ConnectionStatusService);
  private readonly typewriter = inject(TypewriterService);
  private readonly scrollManager = inject(ScrollManagerService);
  private readonly sessionsEvents = inject(SessionsEventsService);
  private readonly events = inject(ChatEventsService);

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
  private defer(fn: () => void) {
    queueMicrotask(fn);
  }
  ngOnInit() {
    // Carga inmediata basada en snapshot para refrescos directos
    const snapSession =
      this.route.snapshot.paramMap.get('sessionId') ||
      this.route.snapshot.queryParamMap.get('session');
    if (snapSession) {
      this.selectedSessionId = snapSession;
      this.cdr.markForCheck();
      // Cargar inmediatamente sin defer para F5
      this.loadSession(snapSession);
    }
    // Emitir refresh para que el sidebar cargue sesiones tras F5
    this.defer(() => this.sessionsEvents.triggerRefresh());

    // Listen for header-driven files modal open/close events
    this.sessionsEvents.onFilesModal().subscribe(({ open, sessionId }) => {
      if (open) {
        // Prefer provided id or current selected
        const sid = sessionId ?? this.selectedSessionId;
        if (!sid) return;
        this.selectedSessionId = sid;
        this.openSessionFiles();
      } else {
        this.closeSessionFiles();
      }
    });

    // React to either /chat/session/:sessionId or legacy query param
    this.route.paramMap.subscribe((p) => {
      const paramSession = p.get('sessionId');
      if (paramSession) {
        // Solo actualizar si es diferente al actual
        if (this.selectedSessionId !== paramSession) {
          this.selectedSessionId = paramSession;
          this.cdr.markForCheck();
          // Si estamos en medio de un stream y este sessionId acaba de ser creado, no cargamos aún para no abortar SSE
          if (this.isSending() && this.streamingSessionId === paramSession) {
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
        if (sessionId) {
          if (this.selectedSessionId !== sessionId) {
            this.selectedSessionId = sessionId;
            this.cdr.markForCheck();
            this.loadSession(sessionId);
            this.defer(() => this.sessionsEvents.triggerRefresh());
          }
          return;
        }
        // No hay session en la ruta (/chat): dejar SIEMPRE la pantalla limpia
        this.selectedSessionId = null;
        // Limpiar estado de streaming/UI y mensajes
        this.cleanup();
        this.chatFacade.clearMessages();
        this.chatFacade.setIsSending(false);
        this.chatFacade.setToolRunning(false);
        this.connectionStatus.setStatus('idle');
        this.currentMessage = null;
        this.uploadedFiles = [];
        this.filesToUpload = [];
        this.cdr.detectChanges();
        this.defer(() => this.sessionsEvents.triggerRefresh());
      });
    });
  }

  agentIdValue(): string {
    // Backend ignores agent; return a constant placeholder
    return 'default';
  }

  // Scroll handling delegated to messages-list component

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
    this.chatFacade.setIsSending(false);
    this.chatFacade.setToolRunning(false);
    this.connectionStatus.setStatus('idle');
    this.currentMessage = null;

    this.chatFacade.getSession(sessionId).subscribe({
      next: (data) => {
        console.log(`✅ Sesión cargada exitosamente: ${sessionId}`, data);
        const d: any = data as any;
        const chats =
          d?.chats ?? d?.session?.chats ?? (Array.isArray(d) ? d : []);
        this.chatFacade.setMessages(adaptChatEntriesToMessages(chats));

        console.log(`📝 Mensajes cargados: ${this.messages().length}`);

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
          console.warn(
            `🔄 Reintentando cargar sesión en ${delay}ms (intento ${
              attempt + 1
            })...`
          );
          setTimeout(() => this.loadSession(sessionId, attempt + 1), delay);
          return;
        }
        // Manejar 404 sin romper la vista o agotados los intentos
        console.warn(
          `⚠️ No se pudo cargar la sesión después de ${attempt + 1} intentos`
        );
        // Limpiar mensajes en caso de error para evitar mostrar contenido de otra sesión
        this.chatFacade.clearMessages();
        this.cdr.detectChanges();
      },
    });
  }

  sendMessage() {
    const messageContent = this.msgForm.get('message')?.value?.trim();
    const hasFiles = this.filesToUpload.length > 0;
    if (
      (!messageContent && !hasFiles) ||
      this.isSending() ||
      this.isUploadingFiles
    ) {
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
      this.chatFacade.clearMessages();
    }
    this.currentMessage = null;
    this.chatFacade.setIsSending(true);
    this.connectionStatus.setStatus('connecting');

    // Agregar mensaje del usuario (via facade)
    this.chatFacade.addUserMessage(content);
    this.scrollManager.scheduleScrollToBottom();
    this.cdr.detectChanges();

    // Iniciar stream: usar archivos ya subidos (si los hay)
    const fileIds: string[] = (this.uploadedFiles || []).map((u) => u.id);

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
      // no enviamos archivos binarios; usamos file_ids
      file_ids: fileIds,
    };
    this.subscription = this.chatFacade.sendMessage(payload).subscribe({
      next: (data: StreamResponseModel) => this.handleStreamData(data),
      error: (error) => this.handleError(error),
      complete: () => this.handleComplete(),
    });
  }

  private handleStreamData(data: StreamResponseModel) {
    console.log('📨 Procesando datos del stream:', data);
    this.events.handleStreamData(this.ctx(), data);
  }

  private handleRunResponse(data: StreamResponseModel) {
    console.log('🤖 Respuesta del run:', data);

    this.events.handleRunResponse(this.ctx(), data);
  }

  private enrichCurrentMessage(data: StreamResponseModel) {
    this.events.enrichCurrentMessage(this.ctx(), data);
  }

  private handleRunCompleted(data: StreamResponseModel) {
    this.events.handleRunCompleted(this.ctx(), data);
  }

  private handleError(error: any) {
    this.events.handleError(this.ctx(), error);
  }

  private handleComplete() {
    this.events.handleComplete(this.ctx());
    // limpiar selección local de archivos tras completar envío
    this.filesToUpload = [];
    this.uploadedFiles = [];
    this.cdr.markForCheck();
  }

  // TTS controls handled in messages-list component

  private cleanup() {
    if (this.subscription) {
      this.subscription.unsubscribe();
      this.subscription = null;
    }
    this.typewriter.stopTypewriter();
  }

  private ctx() {
    const self = this;
    // Return a live reference context object used by ChatEventsService
    const ctx = {
      get currentMessage() {
        return self.currentMessage;
      },
      set currentMessage(v: ChatMessage | null) {
        self.currentMessage = v;
      },
      get selectedSessionId() {
        return self.selectedSessionId;
      },
      set selectedSessionId(v: string | null) {
        self.selectedSessionId = v;
      },
      get streamingSessionId() {
        return self.streamingSessionId;
      },
      set streamingSessionId(v: string | null) {
        self.streamingSessionId = v;
      },
      cdr: this.cdr,
    } as {
      currentMessage: ChatMessage | null;
      selectedSessionId: string | null;
      streamingSessionId: string | null;
      cdr: ChangeDetectorRef;
    };
    return ctx;
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
    this.chatFacade.setIsSending(false);
    this.chatFacade.setToolRunning(false);
    this.connectionStatus.setStatus('idle');
    this.chatFacade.addSystemMessage(
      '🚫 Envío cancelado por el usuario',
      'Cancelled' as EventType
    );
  }

  openSessionFiles() {
    if (!this.selectedSessionId) return;
    this.showFilesModal = true;
    this.cdr.markForCheck();
  }

  closeSessionFiles() {
    this.showFilesModal = false;
    this.cdr.markForCheck();
  }

  onFilesSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      if (!this.selectedSessionId) {
        this.chatFacade.addSystemMessage(
          'Primero envía un mensaje para crear la sesión y luego adjunta archivos.',
          'Info' as EventType
        );
        try { input.value = ''; } catch {}
        return;
      }
      const newlySelected = Array.from(input.files);
      // Append to existing selection, de-duplicating by name+size+lastModified
      const combine = [...this.filesToUpload, ...newlySelected];
      const seen = new Set<string>();
      this.filesToUpload = combine.filter((f) => {
        const key = `${f.name}|${f.size}|${(f as any).lastModified ?? ''}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      // iniciar carga inmediata solo de los nuevos seleccionados
      this.isUploadingFiles = true;
      this.cdr.markForCheck();
      // Require a session to associate files. If there's no session yet, send after first message creates it.
      this.chatFacade
        .uploadFiles(newlySelected, { sessionId: this.selectedSessionId ?? undefined, subfolder: 'chat' })
        .then((uploaded) => {
          // merge results por id
          const byId = new Map<string, UploadedFileMeta>();
          for (const u of this.uploadedFiles) byId.set(u.id, u);
          for (const u of uploaded) byId.set(u.id, u);
          this.uploadedFiles = Array.from(byId.values());
        })
  .catch((e) => {
          console.error('Error subiendo archivos:', e);
          this.chatFacade.addSystemMessage(
            '⚠️ No se pudieron subir algunos archivos',
            'ToolCallResult' as EventType
          );
        })
        .finally(() => {
          this.isUploadingFiles = false;
          this.cdr.markForCheck();
        });

      // Permitir volver a seleccionar los mismos archivos reseteando el input
      try { input.value = ''; } catch {}
    } else {
      this.filesToUpload = [];
      this.uploadedFiles = [];
    }
  }

  removeUploadedFile(file: UploadedFileMeta) {
    // remove from uploadedFiles
    this.uploadedFiles = this.uploadedFiles.filter((u) => u.id !== file.id);
    // also remove from filesToUpload by matching name/size if present
    this.filesToUpload = this.filesToUpload.filter(
      (f) => !(f.name === file.filename || `${f.size}` === (file as any).size)
    );
    this.cdr.markForCheck();
  }

  ngOnDestroy() {
    this.cleanup();
    this.connectionStatus.destroy();
  }
}
