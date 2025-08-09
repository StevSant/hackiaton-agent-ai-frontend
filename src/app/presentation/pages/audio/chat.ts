import {
  Component,
  inject,
  ChangeDetectorRef,
  type ElementRef,
  ViewChild,
  type AfterViewChecked,
  type OnDestroy,
  type OnInit,
  input,
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
import { NgZone } from '@angular/core';

// Servicios de utilidades
import { ChatUtilsService } from '@infrastructure/services/chat-utils.service';
import { ConnectionStatusService } from '@infrastructure/services/connection-status.service';
import { TypewriterService } from '@infrastructure/services/typewriter.service';
import { ScrollManagerService } from '@infrastructure/services/scroll-manager.service';
import { MessageManagerService } from '@infrastructure/services/message-manager.service';
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
import { SttService } from '@infrastructure/services/stt.service';
import { VoiceService } from '@infrastructure/services/voice.service';
import { VoskSttService } from '@infrastructure/services/vosk-stt.service';

@Component({
  selector: 'app-audio-chat',
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
export class AudioChat implements OnDestroy, AfterViewChecked, OnInit {
  @ViewChild('messagesContainer', { static: false })
  private readonly messagesContainer!: ElementRef;

  // Configuración
  readonly agentId = input<string>();
  private readonly typewriterSpeed = 25;

  // Estado reactivo
  messages: ChatMessage[] = [];
  currentMessage: ChatMessage | null = null;
  isSending = false;
  debugMode = false;
  sessions: SessionEntry[] = [];
  selectedSessionId: string | null = null;
  audioFile: File | null = null;
  // Optional file attachments (pdf, images, etc.)
  attachments: File[] = [];
  uploadedFiles: UploadedFileMeta[] = [];
  toolRunning = false;
  private currentAgentId: string | null = null;
  private streamingSessionId: string | null = null;
  // Audio recording state
  isRecording = false;
  private mediaRecorder: MediaRecorder | null = null;
  private recordedChunks: Blob[] = [];
  private micStream: MediaStream | null = null;
  micError: string | null = null;
  // Speech-to-Text state
  private recognition: any = null;
  isTranscribing = false;
  sttError: string | null = null;
  // Text-to-Speech auto playback (fallback when backend doesn't return audio)
  // Disabled by default; user can use controls to play.
  autoTTS = false;
  // User option: include original recorded audio in the request
  includeAudioOriginal = false;
  // TTS control state
  private ttsUtter: SpeechSynthesisUtterance | null = null;
  ttsMessageId: string | null = null;
  ttsState: 'idle' | 'playing' | 'paused' = 'idle';
  ttsVolume = 1;

  // Servicios
  private readonly chatStream = inject<ChatStreamPort>(CHAT_STREAM_PORT);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly location = inject(Location);
  private readonly zone = inject(NgZone);

  // Servicios de utilidades
  protected chatUtils = inject(ChatUtilsService);
  protected connectionStatus = inject(ConnectionStatusService);
  private readonly typewriter = inject(TypewriterService);
  private readonly scrollManager = inject(ScrollManagerService);
  private readonly messageManager = inject(MessageManagerService);
  private readonly filesService = inject(FilesService);
  private readonly sessionsPort = inject<SessionsPort>(SESSIONS_PORT);
  private readonly stt = inject(SttService);
  private readonly voice = inject(VoiceService);
  private readonly vosk = inject(VoskSttService);
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
    // React to either /chat/:agentId/session/:sessionId param or legacy ?session= query param
    this.route.paramMap.subscribe((p) => {
      this.currentAgentId = p.get('agentId');
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

  agentIdValue(): string | null {
  const fromParam: string | null = this.currentAgentId ?? this.route.snapshot.paramMap.get('agentId');
    const fromInput: string | undefined = this.agentId();
    return fromParam ?? fromInput ?? null;
  }

  ngAfterViewChecked() {
    this.scrollManager.executeScheduledScroll(this.messagesContainer);
  }

  loadSessions() {
    const id = this.agentIdValue();
    if (!id) return;
    this.listSessionsUC.execute(id).subscribe((data: SessionEntry[]) => {
      this.sessions = data || [];
      this.cdr.markForCheck();
    });
  }

  loadSession(sessionId: string | null) {
    const id = this.agentIdValue();
    if (!id) return;
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
    const messageContent = (this.msgForm.get('message')?.value ?? '').toString().trim();
    const id = this.agentIdValue();
    // Require non-empty text message to avoid backend interpreting it as a voice-only request
    if (!messageContent || this.isSending || !id) {
      this.msgForm.get('message')?.markAsTouched();
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
  // Use the exact typed/transcribed content for the visible user message
  const userMsg = this.messageManager.addUserMessage(this.messages, content);
    // Adjuntar reproducción local del audio grabado (si existe)
  if (this.audioFile && this.includeAudioOriginal) {
      const objectUrl = URL.createObjectURL(this.audioFile);
      (userMsg as any).audio = [{ id: `local-${Date.now()}`, url: objectUrl }];
    }
    // Attachments preview (basic: list filenames)
    if (this.attachments.length) {
      (userMsg as any).attachments = this.attachments.map((f, i) => ({ id: `att-${i}`, name: f.name }));
    }
    this.scrollManager.scheduleScrollToBottom();
    this.cdr.detectChanges();

    // Iniciar stream
    // Upload attachments to get file_ids
    let fileIds: string[] = [];
    if (this.attachments.length) {
      try {
        const uploaded: UploadedFileMeta[] = [];
        for (const f of this.attachments) {
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
      file_ids?: string[];
    } = {
      // Send the actual text content only; do not fall back to placeholders
      message: content,
      session_id: this.selectedSessionId ?? undefined,
      user_id: undefined,
      audioFile: this.includeAudioOriginal ? (this.audioFile ?? undefined) : undefined,
      file_ids: fileIds,
    };
    this.subscription = this.sendMessageUC
      .execute(this.agentIdValue() as string, payload)
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
    if (!this.selectedSessionId && raw?.session_id && this.agentIdValue()) {
      this.selectedSessionId = raw.session_id;
      this.streamingSessionId = raw.session_id;
  // Actualizamos la URL sin navegar para no abortar el SSE
  const agent = this.agentIdValue()!;
  this.location.replaceState(`/chat/${agent}/session/${raw.session_id}`);
    }

    // Auto-reproducir audio del asistente si llegó
    if (this.currentMessage && (this.currentMessage as any).audio?.length) {
      const items = (this.currentMessage as any).audio as any[];
      const last = items[items.length - 1];
      const src = this.getAudioSrc(last);
      if (src) {
        try {
          const a = new Audio(src);
          // No bloquear si falla autoplay
          a.play().catch(() => {});
        } catch {
          // Ignorar
        }
      }
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
      this.applyFinalArtifacts(data);
    }

    if (this.currentMessage) {
      this.typewriter.completeMessage(this.currentMessage);
    }

    this.toolRunning = false;
    this.scrollManager.scheduleScrollToBottom();
  this.cdr.detectChanges();
  // Ya terminó el stream; si teníamos sessionId en curso, liberamos bandera
  this.streamingSessionId = null;

  // Fallback TTS: If no audio was provided by backend, optionally read the response aloud
  if (this.autoTTS && this.currentMessage && (!this.currentMessage.audio || this.currentMessage.audio.length === 0)) {
    const text = this.currentMessage.displayedContent || this.currentMessage.content || '';
    if (text && typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        const utter = new SpeechSynthesisUtterance(text);
        utter.rate = 1;
        utter.pitch = 1;
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(utter);
      } catch {}
    }
  }

  }

  private applyFinalArtifacts(data: StreamResponseModel) {
    if (!this.currentMessage) return;
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
    if (raw?.response_audio) this.currentMessage.response_audio = raw.response_audio;
  }

  // Audio recording helpers
  get canRecord(): boolean {
    return !!(navigator.mediaDevices && (navigator.mediaDevices as any).getUserMedia);
  }

  async startRecording() {
    if (this.isRecording) return;
    this.micError = null;
    try {
      // Only capture raw audio if user wants to attach it; otherwise rely on SpeechRecognition only
      if (this.includeAudioOriginal && this.canRecord) {
        this.micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : 'audio/webm';
        this.mediaRecorder = new MediaRecorder(this.micStream, { mimeType });
        this.recordedChunks = [];
        this.mediaRecorder.ondataavailable = (e) => { if (e.data && e.data.size > 0) this.recordedChunks.push(e.data); };
        this.mediaRecorder.onstop = async () => {
          const blob = new Blob(this.recordedChunks, { type: this.mediaRecorder?.mimeType || 'audio/webm' });
          this.audioFile = new File([blob], `recording-${Date.now()}.webm`, { type: blob.type });
          // Release stream
          this.micStream?.getTracks().forEach(t => t.stop());
          this.micStream = null;
          // If no text captured via browser STT, attempt server-side STT to populate textarea
          const current = (this.msgForm.get('message')?.value || '').toString().trim();
          if (!current && this.audioFile) {
            try {
              const transcript = await this.stt.transcribeBlob(blob);
              if (transcript) {
                this.msgForm.get('message')?.setValue(transcript);
                this.cdr.detectChanges();
              }
            } catch (e: any) {
              this.sttError = e?.message || 'No se pudo transcribir el audio en el servidor';
              this.cdr.detectChanges();
            }
          }
        };
        this.mediaRecorder.start();
      }
      this.isRecording = true;
      // Start speech recognition if supported
      this.startSpeechRecognition();
      this.cdr.detectChanges();
    } catch (err: any) {
      this.micError = err?.message || 'No se pudo acceder al micrófono';
      this.isRecording = false;
      this.mediaRecorder = null;
      if (this.micStream) {
        try { this.micStream.getTracks().forEach(t => t.stop()); } catch {}
      }
      this.micStream = null;
    }
  }

  stopRecording() {
    if (!this.mediaRecorder || !this.isRecording) return;
    try { this.mediaRecorder.stop(); } catch {}
    this.isRecording = false;
  // Stop speech recognition if active
  this.stopSpeechRecognition();
    this.cdr.detectChanges();
  }

  toggleRecording() {
    if (this.isRecording) {
      this.stopRecording();
    } else {
      this.startRecording();
    }
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
    if (!input.files) {
      this.attachments = [];
      return;
    }
    // Accept common docs and images
    this.attachments = Array.from(input.files);
  }

  ngOnDestroy() {
    this.cleanup();
    this.stopSpeechRecognition();
  this.ttsStop();
    this.connectionStatus.destroy();
  }

  // Speech Recognition helpers (Web Speech API)
  private get speechRecognitionCtor(): any {
    const w = window as any;
    return w?.SpeechRecognition || w?.webkitSpeechRecognition || null;
  }

  get supportsSpeechRecognition(): boolean {
  return this.voice.isSupported();
  }

  private startSpeechRecognition() {
    // Prefer Web Speech API; fallback to Vosk offline if not supported
    if (!this.supportsSpeechRecognition) {
      this.startVoskFallback();
      return;
    }
    try {
      this.isTranscribing = true;
      this.sttError = null;
  this.voice.start({ interim: true, continuous: false }).subscribe({
        next: (e) => {
          this.msgForm.get('message')?.setValue(e.text, { emitEvent: false });
          this.cdr.detectChanges();
        },
        error: (err) => {
          const code = (err && (err.error || err.name)) || 'unknown';
          const map: Record<string, string> = {
            'no-speech': 'No se detectó voz. Intenta hablar más cerca del micrófono.',
            'audio-capture': 'No se encontró micrófono. Revisa los permisos.',
            'not-allowed': 'Permiso denegado para usar el micrófono. Otorga permisos en el navegador.',
            'service-not-allowed': 'El reconocimiento de voz no está permitido en este contexto.',
            'network': 'Error de red con el servicio de voz.',
          };
          this.sttError = map[code] || `Error de reconocimiento: ${code}`;
          this.isTranscribing = false;
          this.cdr.detectChanges();
        },
        complete: () => {
          this.isTranscribing = false;
          this.cdr.detectChanges();
        },
      });
    } catch {
      this.isTranscribing = false;
    }
  }

  private async startVoskFallback() {
    try {
      this.isTranscribing = true;
      this.sttError = null;
      await this.vosk.init({ wasmPath: '/assets/vosk/', modelPath: '/assets/vosk/es/' });
      const stream$ = await this.vosk.start();
      stream$.subscribe({
        next: (text) => {
          this.msgForm.get('message')?.setValue(text, { emitEvent: false });
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.sttError = err?.message || 'Error en Vosk';
          this.isTranscribing = false;
          this.cdr.detectChanges();
        },
        complete: () => {
          this.isTranscribing = false;
          this.cdr.detectChanges();
        }
      });
    } catch (e: any) {
      this.sttError = e?.message || 'No se pudo iniciar Vosk';
      this.isTranscribing = false;
      this.cdr.detectChanges();
    }
  }

  private stopSpeechRecognition() {
    try {
  this.voice.stop();
  this.vosk.stop();
    } catch {}
    this.isTranscribing = false;
    this.recognition = null;
  }

  // TTS Controls (SpeechSynthesis)
  get supportsSpeechSynthesis(): boolean {
    return typeof window !== 'undefined' && 'speechSynthesis' in window;
  }

  ttsPlay(message: ChatMessage) {
    if (!this.supportsSpeechSynthesis) return;
    this.ttsStop();
    const text = message.displayedContent || message.content || '';
    if (!text) return;
    try {
      const utter = new SpeechSynthesisUtterance(text);
      utter.lang = 'es-ES';
      utter.rate = 1;
      utter.pitch = 1;
      utter.volume = this.ttsVolume; // 0..1
      utter.onend = () => {
        this.ttsState = 'idle';
        this.ttsMessageId = null;
        this.ttsUtter = null;
        this.cdr.detectChanges();
      };
      this.ttsUtter = utter;
      this.ttsMessageId = message.id;
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utter);
      this.ttsState = 'playing';
      this.cdr.detectChanges();
    } catch {}
  }

  ttsPause() {
    if (!this.supportsSpeechSynthesis || this.ttsState !== 'playing') return;
    try { window.speechSynthesis.pause(); this.ttsState = 'paused'; this.cdr.detectChanges(); } catch {}
  }

  ttsResume() {
    if (!this.supportsSpeechSynthesis || this.ttsState !== 'paused') return;
    try { window.speechSynthesis.resume(); this.ttsState = 'playing'; this.cdr.detectChanges(); } catch {}
  }

  ttsStop() {
    if (!this.supportsSpeechSynthesis) return;
    try { window.speechSynthesis.cancel(); } catch {}
    this.ttsState = 'idle';
    this.ttsMessageId = null;
    this.ttsUtter = null;
    this.cdr.detectChanges();
  }

  setTtsVolume(v: number) {
    const clamped = Math.max(0, Math.min(1, v));
    this.ttsVolume = clamped;
    // Takes effect on next play
    this.cdr.detectChanges();
  }
}
