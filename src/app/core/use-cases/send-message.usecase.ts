import type { Observable } from 'rxjs';
import type { StreamResponseModel } from '@core/models';
import type { ChatStreamPort } from '@core/ports';

export class SendMessageUseCase {
  constructor(private readonly chatStream: ChatStreamPort) {}

  execute(
    agentId: string,
  payload: { message?: string; session_id?: string; user_id?: string; audioFile?: File; files?: File[] }
  ): Observable<StreamResponseModel> {
    return this.chatStream.streamFromAgent(agentId, payload);
  }

  cancel(): void {
    this.chatStream.cancel();
  }
}
