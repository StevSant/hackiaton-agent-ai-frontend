import type { Observable } from 'rxjs';
import type { StreamResponseModel } from '@core/models/stream';
import type { ChatStreamPort } from '@core/ports/chat-stream.port';

export class SendMessageUseCase {
  constructor(private readonly chatStream: ChatStreamPort) {}

  execute(
    agentId: string,
    payload: { message?: string; session_id?: string; user_id?: string; audioFile?: File }
  ): Observable<StreamResponseModel> {
    return this.chatStream.streamFromAgent(agentId, payload);
  }

  cancel(): void {
    this.chatStream.cancel();
  }
}
