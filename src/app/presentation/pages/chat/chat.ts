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

// Servicios/utilidades
import {
  ChatUtilsService,
  ConnectionStatusService,
  TypewriterService,
  ScrollManagerService,
  TtsService,
  SessionsEventsService,
  ChatEventsService,
} from '@infrastructure/services';
import { ChatFacade } from '@app/application';
import { adaptChatEntriesToMessages } from '@core/adapters';
import { MarkdownModule } from 'ngx-markdown';
import { TranslateModule } from '@ngx-translate/core';
import type { UploadedFileMeta } from '@core/ports';
import { MatIconModule } from '@angular/material/icon';
import { ChatMessagesListComponent } from '../../components/chat/messages-list.component';
import { ChatComposerComponent } from '../../components/chat/composer.component';
import { SessionFilesModalComponent } from '../../components/files/session-files-modal.component';
import { SessionCompaniesModalComponent } from '../../components/companies/session-companies-modal.component';

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
    SessionCompaniesModalComponent,
  ],
  templateUrl: './chat.html',
  styleUrls: ['./chat.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Chat implements OnDestroy, OnInit {
  // Servicios
  private readonly chatFacade = inject(ChatFacade);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly location = inject(Location);

  protected chatUtils = inject(ChatUtilsService);
  protected connectionStatus = inject(ConnectionStatusService);
  private readonly typewriter = inject(TypewriterService);
  private readonly scrollManager = inject(ScrollManagerService);
  readonly tts = inject(TtsService);
  private readonly sessionsEvents = inject(SessionsEventsService);
  private readonly events = inject(ChatEventsService);

  // Estado/reactivo
  readonly messages = this.chatFacade.messages;
  readonly isSending = this.chatFacade.isSending;
  readonly toolRunning = this.chatFacade.toolRunning;

  sessions: SessionEntry[] = [];
  selectedSessionId: string | null = null;
  currentMessage: ChatMessage | null = null;

  // Archivos
  filesToUpload: File[] = [];
  uploadedFiles: UploadedFileMeta[] = [];
  isUploadingFiles = false;
  showFilesModal = false;
  showCompaniesModal = false;

  // Streaming
  private streamingSessionId: string | null = null;
  private subscription: Subscription | null = null;
  private uiSub: Subscription | null = null;

  // Límites de archivos
  private readonly MAX_FILES_PER_DROP = 10;
  private readonly MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024; // 25MB

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
    // Lee sesión de la URL (param o query)
    const snapSession =
      this.route.snapshot.paramMap.get('sessionId') ||
      this.route.snapshot.queryParamMap.get('session');
    if (snapSession) {
      this.selectedSessionId = snapSession;
      this.cdr.markForCheck();
      this.loadSession(snapSession);
    }
    queueMicrotask(() => this.sessionsEvents.triggerRefresh());

    this.route.paramMap.subscribe((p) => {
      const paramSession = p.get('sessionId');
      if (paramSession) {
        if (this.selectedSessionId !== paramSession) {
          this.selectedSessionId = paramSession;
          this.cdr.markForCheck();
          if (this.isSending() && this.streamingSessionId === paramSession)
            return;
          this.loadSession(paramSession);
          queueMicrotask(() => this.sessionsEvents.triggerRefresh());
        }
        return;
      }
      this.route.queryParamMap.subscribe((q) => {
        const sessionId = q.get('session');
        if (sessionId) {
          if (this.selectedSessionId !== sessionId) {
            this.selectedSessionId = sessionId;
            this.cdr.markForCheck();
            this.loadSession(sessionId);
            queueMicrotask(() => this.sessionsEvents.triggerRefresh());
          }
          return;
        }
        // No hay sesión => limpiar
        this.selectedSessionId = null;
        this.cleanup();
        this.chatFacade.clearMessages();
        this.chatFacade.setIsSending(false);
        this.chatFacade.setToolRunning(false);
        this.connectionStatus.setStatus('idle');
        this.currentMessage = null;
        this.uploadedFiles = [];
        this.filesToUpload = [];
        this.cdr.detectChanges();
        queueMicrotask(() => this.sessionsEvents.triggerRefresh());
      });
    });

    // Listen for global requests to open/close the files modal (from shell header)
    this.uiSub = this.sessionsEvents
      .onFilesModal()
      .subscribe(({ open, sessionId }) => {
        if (open) {
          // Prefer provided sessionId; otherwise use current selection
          if (sessionId) {
            this.selectedSessionId = sessionId;
            this.cdr.markForCheck();
          }
          if (!this.ensureSessionOrWarn()) {
            return;
          }
          this.showFilesModal = true;
          this.cdr.markForCheck();
        } else {
          this.showFilesModal = false;
          this.cdr.markForCheck();
        }
      });
    // Companies modal events
    this.sessionsEvents.onCompaniesModal().subscribe(({ open, sessionId }) => {
      if (open) {
        if (sessionId) {
          this.selectedSessionId = sessionId;
          this.cdr.markForCheck();
        }
        if (!this.ensureSessionOrWarn()) return;
        this.showCompaniesModal = true;
        this.cdr.markForCheck();
      } else {
        this.showCompaniesModal = false;
        this.cdr.markForCheck();
      }
    });
  }

  loadSessions() {
    this.chatFacade.listSessions().subscribe((d: SessionEntry[]) => {
      this.sessions = d || [];
      this.cdr.markForCheck();
    });
  }

  loadSession(sessionId: string | null, attempt: number = 0) {
    this.selectedSessionId = sessionId;
    if (!sessionId) return;

    this.cleanup();
    this.chatFacade.setIsSending(false);
    this.chatFacade.setToolRunning(false);
    this.connectionStatus.setStatus('idle');
    this.currentMessage = null;

    this.chatFacade.getSession(sessionId).subscribe({
      next: (data) => {
        const d: any = data as any;
        const chats =
          d?.chats ?? d?.session?.chats ?? (Array.isArray(d) ? d : []);
        this.chatFacade.setMessages(adaptChatEntriesToMessages(chats));
        this.cdr.markForCheck();
        this.cdr.detectChanges();
        setTimeout(() => {
          this.scrollManager.scheduleScrollToBottom();
          this.cdr.detectChanges();
        }, 100);
        queueMicrotask(() => {
          this.cdr.detectChanges();
          this.scrollManager.scheduleScrollToBottom();
        });
      },
      error: (err) => {
        const status = (err && (err.status ?? err.code)) as number | undefined;
        const isNotFound = status === 404;
        if (!isNotFound && attempt < 3) {
          const delays = [300, 800, 1500];
          const delay = delays[Math.min(attempt, delays.length - 1)];
          setTimeout(() => this.loadSession(sessionId, attempt + 1), delay);
          return;
        }
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
    this.cleanup();
    if (!this.selectedSessionId) {
      this.chatFacade.clearMessages();
    }

    this.currentMessage = null;
    this.chatFacade.setIsSending(true);
    this.connectionStatus.setStatus('connecting');

    this.chatFacade.addUserMessage(content);
    this.scrollManager.scheduleScrollToBottom();
    this.cdr.detectChanges();

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
      file_ids: fileIds,
    };

    this.subscription = this.chatFacade.sendMessage(payload).subscribe({
      next: (data: StreamResponseModel) => this.handleStreamData(data),
      error: (error) => this.handleError(error),
      complete: () => this.handleComplete(),
    });
  }

  private handleStreamData(data: StreamResponseModel) {
    this.events.handleStreamData(this.ctx(), data);
  }
  private handleRunResponse(data: StreamResponseModel) {
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
    this.filesToUpload = [];
    this.uploadedFiles = [];
    this.cdr.markForCheck();
  }

  // Utilidades de contexto y limpieza
  private cleanup() {
    if (this.subscription) {
      this.subscription.unsubscribe();
      this.subscription = null;
    }
    this.typewriter.stopTypewriter();
  }

  private ctx() {
    const self = this;
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

  // Helpers para el template
  trackByMessageId = this.chatUtils.trackByMessageId.bind(this.chatUtils);
  getEventLabel = this.chatUtils.getEventLabel.bind(this.chatUtils);
  formatTimestamp = this.chatUtils.formatTimestamp.bind(this.chatUtils);
  isUserMessage = this.chatUtils.isUserMessage.bind(this.chatUtils);
  isSystemMessage = this.chatUtils.isSystemMessage.bind(this.chatUtils);
  isBotMessage = this.chatUtils.isBotMessage.bind(this.chatUtils);
  isErrorMessage = this.chatUtils.isErrorMessage.bind(this.chatUtils);
  getConnectionStatusText = this.connectionStatus.getStatusText.bind(
    this.connectionStatus,
  );
  getConnectionStatusClass = this.connectionStatus.getStatusClass.bind(
    this.connectionStatus,
  );

  // UI handlers
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
      'Cancelled' as EventType,
    );
  }
  openSessionFiles() {
    if (!this.selectedSessionId) return;
    this.showFilesModal = true;
    this.cdr.markForCheck();
  }
  closeSessionFiles() {
    this.showFilesModal = false;
    // Notify others that the modal is closed
    try {
      this.sessionsEvents.closeFilesModal();
    } catch {}
    this.cdr.markForCheck();
  }

  closeSessionCompanies() {
    this.showCompaniesModal = false;
    try {
      this.sessionsEvents.closeCompaniesModal();
    } catch {}
    this.cdr.markForCheck();
  }

  // Archivos: selección y DnD delegan a un flujo común
  onFilesSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.processIncomingFiles(Array.from(input.files));
      try {
        input.value = '';
      } catch {}
    } else {
      this.filesToUpload = [];
      this.uploadedFiles = [];
    }
  }
  onFilesDropped(files: File[]) {
    if (!files || files.length === 0) return;
    this.processIncomingFiles(files);
  }

  private ensureSessionOrWarn(): boolean {
    if (!this.selectedSessionId) {
      this.chatFacade.addSystemMessage(
        'Primero envía un mensaje para crear la sesión y luego adjunta archivos.',
        'Info' as EventType,
      );
      return false;
    }
    return true;
  }

  private validateFiles(files: File[]) {
    const tooMany = files.length > this.MAX_FILES_PER_DROP;
    const oversized = files.filter((f) => f.size > this.MAX_FILE_SIZE_BYTES);

    if (tooMany) {
      this.chatFacade.addSystemMessage(
        `⚠️ Máximo ${this.MAX_FILES_PER_DROP} archivos por intento.`,
        'ToolCallResult' as EventType,
      );
    }
    if (oversized.length) {
      const names = oversized
        .slice(0, 3)
        .map((f) => f.name)
        .join(', ');
      this.chatFacade.addSystemMessage(
        `⚠️ Algunos archivos superan el límite de 25MB: ${names}${
          oversized.length > 3 ? '…' : ''
        }`,
        'ToolCallResult' as EventType,
      );
    }

    const valid = files
      .filter((f) => f.size <= this.MAX_FILE_SIZE_BYTES)
      .slice(0, this.MAX_FILES_PER_DROP);

    return { valid };
  }

  private dedupeSelection(files: File[]) {
    const combine = [...this.filesToUpload, ...files];
    const seen = new Set<string>();
    this.filesToUpload = combine.filter((f) => {
      const key = `${f.name}|${f.size}|${(f as any).lastModified ?? ''}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  private mergeUploaded(uploaded: UploadedFileMeta[]) {
    const byId = new Map<string, UploadedFileMeta>();
    for (const u of this.uploadedFiles) byId.set(u.id, u);
    for (const u of uploaded) byId.set(u.id, u);
    this.uploadedFiles = Array.from(byId.values());
  }

  private processIncomingFiles(files: File[]) {
    if (!this.ensureSessionOrWarn()) return;

    const { valid } = this.validateFiles(files);
    if (!valid.length) return;

    this.dedupeSelection(valid);

    this.isUploadingFiles = true;
    this.cdr.markForCheck();

    this.chatFacade
      .uploadFiles(valid, {
        sessionId: this.selectedSessionId ?? undefined,
        subfolder: 'chat',
      })
      .then((uploaded) => {
        this.mergeUploaded(uploaded);
        // Once uploaded to the session, clear the local selection so the counter resets
        this.filesToUpload = [];
        this.cdr.markForCheck();
      })
      .catch((e) => {
        console.error('Error subiendo archivos:', e);
        this.chatFacade.addSystemMessage(
          '⚠️ No se pudieron subir algunos archivos',
          'ToolCallResult' as EventType,
        );
      })
      .finally(() => {
        this.isUploadingFiles = false;
        this.cdr.markForCheck();
      });
  }

  removeUploadedFile(file: UploadedFileMeta) {
    this.uploadedFiles = this.uploadedFiles.filter((u) => u.id !== file.id);
    this.filesToUpload = this.filesToUpload.filter(
      (f) =>
        !(
          f.name === (file as any).filename ||
          `${f.size}` === (file as any).size
        ),
    );
    this.cdr.markForCheck();
  }

  ngOnDestroy() {
    this.cleanup();
    if (this.uiSub) {
      this.uiSub.unsubscribe();
      this.uiSub = null;
    }
    this.connectionStatus.destroy();
  }
}
