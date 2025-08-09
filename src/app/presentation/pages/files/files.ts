import { Component, ChangeDetectionStrategy, signal, inject, OnInit } from '@angular/core';
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
export class FilesPage implements OnInit {
  private readonly listFilesUC = inject(ListFilesUseCase);
  private readonly uploadFileUC = inject(UploadFileUseCase);
  
  readonly items = signal<UploadedFileMeta[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly type = signal<'image' | 'pdf' | 'document' | ''>('');

  ngOnInit() {
    this.load();
  }

  async load() {
    this.loading.set(true);
    this.error.set(null);
    try {
      const res = await this.listFilesUC.execute({ 
        type_file: this.type() || undefined, 
        limit: 20, 
        offset: 0 
      });
      this.items.set(res.items || []);
    } catch (e: any) {
      this.error.set(e?.message || 'Error cargando archivos');
    } finally {
      this.loading.set(false);
    }
  }

  async onUpload(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) {
      return;
    }
    
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

  async copyId(id: string) {
    try {
      await navigator.clipboard.writeText(id);
    } catch {
      // fallback: nothing
    }
  }
}
