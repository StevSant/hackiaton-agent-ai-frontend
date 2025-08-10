import { inject, Injectable, signal } from '@angular/core';
import type { Observable } from 'rxjs';
import type {
  StreamResponseModel,
  SessionEntry,
  ChatMessage,
  EventType,
} from '@core/models';
import type {
  ChatStreamPort,
  SessionsPort,
  UploadedFileMeta,
} from '@core/ports';
import { CHAT_STREAM_PORT, SESSIONS_PORT } from '@core/tokens';
import {
  SendMessageUseCase,
  ListSessionsUseCase,
  GetSessionUseCase,
  UploadFileUseCase,
  DeleteSessionUseCase,
} from '@core/use-cases';

@Injectable({ providedIn: 'root' })
export class ChatFacade {
  private readonly chatStream = inject<ChatStreamPort>(CHAT_STREAM_PORT);
  private readonly sessionsPort = inject<SessionsPort>(SESSIONS_PORT);

  private readonly sendMessageUC = new SendMessageUseCase(this.chatStream);
  private readonly listSessionsUC = new ListSessionsUseCase(this.sessionsPort);
  private readonly getSessionUC = new GetSessionUseCase(this.sessionsPort);
  private readonly deleteSessionUC = new DeleteSessionUseCase(
    this.sessionsPort
  );
  private readonly uploadFileUC = inject(UploadFileUseCase);
  // UI state signals to simplify page component
  readonly messages = signal<ChatMessage[]>([]);
  readonly isSending = signal(false);
  readonly toolRunning = signal(false);

  setMessages(list: ChatMessage[]) {
    this.messages.set(list);
  }
  clearMessages() {
    this.messages.set([]);
  }
  addMessage(msg: ChatMessage) {
    this.messages.update((arr) => [...arr, msg]);
  }
  replaceLastMessage(updater: (m: ChatMessage) => ChatMessage) {
    this.messages.update((arr) =>
      arr.length ? [...arr.slice(0, -1), updater(arr[arr.length - 1])] : arr
    );
  }
  setIsSending(v: boolean) {
    this.isSending.set(v);
  }
  setToolRunning(v: boolean) {
    this.toolRunning.set(v);
  }

  // Message helpers (immutable updates)
  private genId(): string {
    return (
      Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2)
    );
  }

  addUserMessage(content: string): ChatMessage {
    const msg: ChatMessage = {
      id: this.genId(),
      content,
      displayedContent: content,
      isComplete: true,
      isStreaming: false,
      event: 'UserMessage',
      timestamp: Date.now(),
    } as ChatMessage;
    this.messages.update((arr) => [...arr, msg]);
    return msg;
  }

  addSystemMessage(content: string, event: EventType): ChatMessage {
    const msg: ChatMessage = {
      id: this.genId(),
      content,
      displayedContent: content,
      isComplete: true,
      isStreaming: false,
      event,
      timestamp: Date.now(),
    } as ChatMessage;
    this.messages.update((arr) => [...arr, msg]);
    return msg;
  }

  addErrorMessage(content: string): ChatMessage {
    const msg: ChatMessage = {
      id: this.genId(),
      content,
      displayedContent: content,
      isComplete: true,
      isStreaming: false,
      event: 'Error',
      timestamp: Date.now(),
    } as ChatMessage;
    this.messages.update((arr) => [...arr, msg]);
    return msg;
  }

  createBotMessage(runId: string, timestamp?: number): ChatMessage {
    const msg: ChatMessage = {
      id: runId || this.genId(),
      content: '',
      displayedContent: '',
      isComplete: false,
      isStreaming: true,
      event: 'RunResponse',
      timestamp: timestamp || Date.now(),
    } as ChatMessage;
    this.messages.update((arr) => [...arr, msg]);
    return msg;
  }

  private agentId(): string {
    return 'default';
  }

  listSessions(params?: { page?: number; limit?: number }): Observable<SessionEntry[]> {
    return this.listSessionsUC.execute(this.agentId(), params);
  }

  getSession(sessionId: string): Observable<unknown> {
    return this.getSessionUC.execute(this.agentId(), sessionId);
  }

  deleteSession(sessionId: string) {
    return this.deleteSessionUC.execute(this.agentId(), sessionId);
  }

  sendMessage(payload: {
    message?: string;
    session_id?: string;
    user_id?: string;
    audioFile?: File;
    files?: File[];
    file_ids?: string[];
  }): Observable<StreamResponseModel> {
    return this.sendMessageUC.execute(this.agentId(), payload);
  }

  cancel(): void {
    this.sendMessageUC.cancel();
  }

  async uploadFiles(files: File[], opts?: { sessionId?: string; subfolder?: string }): Promise<UploadedFileMeta[]> {
    const result: UploadedFileMeta[] = [];
    const sessionId = opts?.sessionId;
    const subfolder = opts?.subfolder ?? 'chat';
    for (const f of files) {
      const meta = await this.uploadFileUC.execute(f, subfolder, sessionId);
      result.push(meta);
    }
    return result;
  }
}
