import { Injectable, inject, signal } from '@angular/core';
import type { UploadedFileMeta } from '@core/ports';
import { ListFilesUseCase, UploadFileUseCase } from '@core/use-cases';

export type FileType = 'image' | 'pdf' | 'document' | '';

@Injectable({ providedIn: 'root' })
export class FilesFacade {
  private readonly listFilesUC = inject(ListFilesUseCase);
  private readonly uploadFileUC = inject(UploadFileUseCase);

  readonly items = signal<UploadedFileMeta[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly type = signal<FileType>('');
  readonly page = signal(1);
  readonly limit = signal(20);
  readonly total = signal(0);

  async load() {
    this.loading.set(true);
    this.error.set(null);
    try {
      const res = await this.listFilesUC.execute({
        type_file: (this.type() || undefined) as any,
        page: this.page(),
        limit: this.limit(),
      });
      this.items.set(res.items || []);
      this.total.set(res.total || 0);
    } catch (e: any) {
      this.error.set(e?.message || 'Error cargando archivos');
    } finally {
      this.loading.set(false);
    }
  }

  list(params?: {
    type_file?: 'image' | 'pdf' | 'document';
    subfolder?: string;
    page?: number;
    limit?: number;
    offset?: number;
  }) {
    return this.listFilesUC.execute(params);
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

  async nextPage() {
    if (this.page() * this.limit() >= this.total()) {
      return;
    }
    this.page.update((p) => p + 1);
    await this.load();
  }
  async prevPage() {
    if (this.page() <= 1) {
      return;
    }
    this.page.update((p) => p - 1);
    await this.load();
  }
}
