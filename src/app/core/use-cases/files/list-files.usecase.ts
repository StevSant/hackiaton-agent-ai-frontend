import { inject } from '@angular/core';
import { FILES_PORT } from '@core/tokens';
import type { FilesPort, ListFilesResponse } from '@core/ports/files.port';

export class ListFilesUseCase {
  private readonly files = inject<FilesPort>(FILES_PORT);
  execute(params?: { type_file?: 'image' | 'pdf' | 'document'; subfolder?: string; limit?: number; offset?: number }): Promise<ListFilesResponse> {
    return this.files.list(params);
  }
}
