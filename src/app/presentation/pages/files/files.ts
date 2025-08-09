import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FilesService, type UploadedFileMeta } from '@infrastructure/services/files.service';

@Component({
  standalone: true,
  selector: 'app-files',
  templateUrl: './files.html',
  styleUrls: ['./files.css'],
  imports: [CommonModule, FormsModule],
})
export class FilesPage {
  private readonly files = inject(FilesService);
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
      const res = await this.files.list({ type_file: this.type || undefined, limit: 20, offset: 0 });
      this.items = res.items || [];
    } catch (e: any) {
      this.error = e?.message || 'Error cargando archivos';
    } finally {
      this.loading = false;
    }
  }

  async onUpload(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files || !input.files.length) return;
    this.loading = true;
    try {
      for (const f of Array.from(input.files)) {
        await this.files.upload(f);
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
