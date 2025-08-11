import { map, Observable } from 'rxjs';
import type { StreamResponseModel } from '@core/models';
import type { SessionsPort } from '@core/ports';

export class SendMessageRestUseCase {
  constructor(private readonly sessions: SessionsPort) {}

  execute(
    agentId: string,
    payload: { message?: string; session_id?: string; user_id?: string; audioFile?: File; files?: File[] }
  ): Observable<StreamResponseModel> {
    return this.sessions.sendMessage(agentId, payload).pipe(
      map((resp: any) => ({
        fullContent: resp?.content || '',
        currentChunk: resp?.content || '',
        event: resp?.event || 'RunResponse',
        isComplete: true,
        isError: !!resp?.error,
        rawMessage: resp,
      }))
    );
  }
}
