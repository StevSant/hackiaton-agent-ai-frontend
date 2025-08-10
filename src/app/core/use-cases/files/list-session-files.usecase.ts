import { inject, Injectable } from '@angular/core';
import { FILES_PORT } from '@core/tokens';
import type { FilesPort, UploadedFileMeta } from '@core/ports';

@Injectable({ providedIn: 'root' })
export class ListSessionFilesUseCase {
  private readonly files = inject<FilesPort>(FILES_PORT);
  execute(sessionId: string): Promise<UploadedFileMeta[]> {
    return this.files.listBySession(sessionId);
  }
}
