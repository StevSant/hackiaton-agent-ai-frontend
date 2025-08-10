import { inject } from '@angular/core';
import { FILES_PORT } from '@core/tokens';
import type { FilesPort, UploadedFileMeta } from '@core/ports';

export class UploadFileUseCase {
  private readonly files = inject<FilesPort>(FILES_PORT);
  execute(file: File, subfolder = ''): Promise<UploadedFileMeta> {
    return this.files.upload(file, subfolder);
  }
}
