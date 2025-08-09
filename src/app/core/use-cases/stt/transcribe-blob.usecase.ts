import { inject } from '@angular/core';
import { STT_PORT } from '@core/tokens';
import type { SttPort } from '@core/ports/stt.port';

export class TranscribeBlobUseCase {
  private readonly stt = inject<SttPort>(STT_PORT);
  execute(blob: Blob, language?: string): Promise<string> {
    return this.stt.transcribeBlob(blob, language);
  }
}
