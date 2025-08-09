import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FilesService, UploadedFileMeta } from '@infrastructure/services/files.service';

@Component({
  selector: 'app-admin-files',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './files.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminFilesPage {
  private readonly files = inject(FilesService);
  items = signal<UploadedFileMeta[]>([]);
  total = signal(0);
  limit = signal(20);
  offset = signal(0);

  async ngOnInit() {
    const res = await this.files.list({ limit: this.limit(), offset: this.offset() });
    this.items.set(res.items || []);
    this.total.set(res.total || 0);
  }

  async next() {
    if (this.offset() + this.limit() >= this.total()) return;
    this.offset.update(o => o + this.limit());
    const res = await this.files.list({ limit: this.limit(), offset: this.offset() });
    this.items.set(res.items || []);
  }

  async prev() {
    if (this.offset() <= 0) return;
    this.offset.update(o => Math.max(0, o - this.limit()));
    const res = await this.files.list({ limit: this.limit(), offset: this.offset() });
    this.items.set(res.items || []);
  }
}
