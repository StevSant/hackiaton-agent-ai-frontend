import type { Observable } from 'rxjs';
import type { StreamResponseModel } from '@core/models';

export interface ChatStreamPort {
  streamFromAgent(
    agentId: string,
    payload: {
      message?: string;
      session_id?: string;
      user_id?: string;
      audioFile?: File;
      files?: File[];
    }
  ): Observable<StreamResponseModel>;
  cancel(): void;
}
