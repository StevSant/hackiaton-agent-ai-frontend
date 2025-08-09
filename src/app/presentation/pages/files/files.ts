import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import type { UploadedFileMeta } from '@core/ports/files.port';
import { ListFilesUseCase } from '@core/use-cases/files/list-files.usecase';
import { UploadFileUseCase } from '@core/use-cases/files/upload-file.usecase';

@Component({
  standalone: true,
  selector: 'app-files',
  templateUrl: './files.html',
  styleUrls: ['./files.css'],
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FilesPage {
  private readonly listFilesUC = new ListFilesUseCase();
  private readonly uploadFileUC = new UploadFileUseCase();
  items: UploadedFileMeta[] = [];
  loading = false;
  error: string | null = null;
  type: 'image' | 'pdf' | 'document' | '' = '';

  async ngOnInit() {
    await this.load();
  }

  async load() {
    this.loading = true;
    this.error = null;
    try {
  const res = await this.listFilesUC.execute({ type_file: this.type || undefined, limit: 20, offset: 0 });
      this.items = res.items || [];
    } catch (e: any) {
      this.error = e?.message || 'Error cargando archivos';
    } finally {
      this.loading = false;
    }
  }

  async onUpload(event: Event) {
  const input = event.target as HTMLInputElement;
  if (!input.files?.length) {
    return;
  }
    this.loading = true;
    try {
      for (const f of Array.from(input.files)) {
  await this.uploadFileUC.execute(f);
      }
      await this.load();
      input.value = '';
    } catch (e: any) {
      this.error = e?.message || 'Error subiendo archivo';
    } finally {
      this.loading = false;
    }
  }

  async copyId(id: string) {
    try {
      await navigator.clipboard.writeText(id);
    } catch {
      // fallback: nothing
    }
  }
}
