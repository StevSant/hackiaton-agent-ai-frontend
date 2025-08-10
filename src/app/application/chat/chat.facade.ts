import { inject, Injectable } from '@angular/core';
import type { Observable } from 'rxjs';
import type { StreamResponseModel, SessionEntry } from '@core/models';
import type { UploadedFileMeta, ChatStreamPort, SessionsPort } from '@core/ports';
import { CHAT_STREAM_PORT, SESSIONS_PORT } from '@core/tokens';
import { SendMessageUseCase, ListSessionsUseCase, GetSessionUseCase, UploadFileUseCase } from '@core/use-cases';

@Injectable({ providedIn: 'root' })
export class ChatFacade {
  private readonly chatStream = inject<ChatStreamPort>(CHAT_STREAM_PORT);
  private readonly sessionsPort = inject<SessionsPort>(SESSIONS_PORT);

  private readonly sendMessageUC = new SendMessageUseCase(this.chatStream);
  private readonly listSessionsUC = new ListSessionsUseCase(this.sessionsPort);
  private readonly getSessionUC = new GetSessionUseCase(this.sessionsPort);
  private readonly uploadFileUC = new UploadFileUseCase();

  private agentId(): string { return 'default'; }

  listSessions(): Observable<SessionEntry[]> {
    return this.listSessionsUC.execute(this.agentId());
  }

  getSession(sessionId: string): Observable<unknown> {
    return this.getSessionUC.execute(this.agentId(), sessionId);
  }

  sendMessage(payload: { message?: string; session_id?: string; user_id?: string; audioFile?: File; files?: File[]; file_ids?: string[] }): Observable<StreamResponseModel> {
    return this.sendMessageUC.execute(this.agentId(), payload);
  }

  cancel(): void {
    this.sendMessageUC.cancel();
  }

  async uploadFiles(files: File[]): Promise<UploadedFileMeta[]> {
    const result: UploadedFileMeta[] = [];
    for (const f of files) {
      const meta = await this.uploadFileUC.execute(f);
      result.push(meta);
    }
    return result;
  }
}
