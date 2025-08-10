import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import type { UploadedFileMeta } from '@core/ports';
import { FilesFacade } from '@app/application/files/files.facade';

@Component({
  selector: 'app-admin-files',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './files.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminFilesPage {
  private readonly files = inject(FilesFacade);
  items = signal<UploadedFileMeta[]>([]);
  total = signal(0);
  limit = signal(20);
  offset = signal(0);
  type_file = signal<'image'|'pdf'|'document'|''>('');
  subfolder = signal<string>('');

  async ngOnInit() {
    const res = await this.list();
    this.items.set(res.items || []);
    this.total.set(res.total || 0);
  }

  private list() {
    return this.files.list({
      limit: this.limit(),
      offset: this.offset(),
      type_file: (this.type_file() || undefined) as any,
      subfolder: this.subfolder() || undefined,
    });
  }

  async next() {
    if (this.offset() + this.limit() >= this.total()) return;
    this.offset.update(o => o + this.limit());
    const res = await this.list();
    this.items.set(res.items || []);
    this.total.set(res.total || 0);
  }

  async prev() {
    if (this.offset() <= 0) return;
    this.offset.update(o => Math.max(0, o - this.limit()));
    const res = await this.list();
    this.items.set(res.items || []);
    this.total.set(res.total || 0);
  }

  async applyFilters() {
    this.offset.set(0);
    const res = await this.list();
    this.items.set(res.items || []);
    this.total.set(res.total || 0);
  }

  onTypeChange(val: string) {
    const v = (val ?? '').trim();
    if (v === '' || v === 'image' || v === 'pdf' || v === 'document') {
      this.type_file.set(v as any);
      this.applyFilters();
    }
  }
}
