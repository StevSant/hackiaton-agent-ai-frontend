import { Injectable, inject, signal } from '@angular/core';
import type { UploadedFileMeta } from '@core/ports/files.port';
import { ListFilesUseCase } from '@core/use-cases/files/list-files.usecase';
import { UploadFileUseCase } from '@core/use-cases/files/upload-file.usecase';

export type FileType = 'image' | 'pdf' | 'document' | '';

@Injectable({ providedIn: 'root' })
export class FilesFacade {
  private readonly listFilesUC = inject(ListFilesUseCase);
  private readonly uploadFileUC = inject(UploadFileUseCase);

  readonly items = signal<UploadedFileMeta[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly type = signal<FileType>('');

  async load() {
    this.loading.set(true);
    this.error.set(null);
    try {
      const res = await this.listFilesUC.execute({
        type_file: (this.type() || undefined) as any,
        limit: 20,
        offset: 0,
      });
      this.items.set(res.items || []);
    } catch (e: any) {
      this.error.set(e?.message || 'Error cargando archivos');
    } finally {
      this.loading.set(false);
    }
  }

  async upload(input: HTMLInputElement) {
    if (!input.files?.length) return;
    this.loading.set(true);
    try {
      for (const file of Array.from(input.files)) {
        await this.uploadFileUC.execute(file);
      }
      await this.load();
      input.value = '';
    } catch (e: any) {
      this.error.set(e?.message || 'Error subiendo archivo');
    } finally {
      this.loading.set(false);
    }
  }
}
