import { inject } from '@angular/core';
import { FILES_PORT } from '@core/tokens';
import type { FilesPort, UploadedFileMeta } from '@core/ports';
import type { Paginated } from '@core/models/paginated';

export class ListFilesUseCase {
  private readonly files = inject<FilesPort>(FILES_PORT);
  execute(params?: { type_file?: 'image' | 'pdf' | 'document'; subfolder?: string; page?: number; limit?: number; offset?: number }): Promise<Paginated<UploadedFileMeta>> {
    return this.files.list(params);
  }
}
