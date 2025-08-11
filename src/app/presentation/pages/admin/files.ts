import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { FormsModule } from '@angular/forms';
import type { UploadedFileMeta } from '@core/ports';
import { FilesFacade } from '@app/application/files/files.facade';
import { AdminMessagesFacade } from '@app/application/admin/admin-messages.facade';

@Component({
  selector: 'app-admin-files',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule],
  templateUrl: './files.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminFilesPage {
  private readonly files = inject(FilesFacade);
  // Reuse AdminMessagesFacade to resolve user details and leverage its cache
  private readonly users = inject(AdminMessagesFacade);
  items = signal<UploadedFileMeta[]>([]);
  total = signal(0);
  limit = signal(20);
  offset = signal(0);
  type_file = signal<'image'|'pdf'|'document'|''>('');
  subfolder = signal<string>('');
  // Expose cached label getter for template
  getCachedUserLabel = this.users.getCachedUserLabel.bind(this.users);

  async ngOnInit() {
    const res = await this.list();
    this.items.set(res.items || []);
    this.total.set(res.total || 0);
  // Warm up user cache for listed files
  const ids = Array.from(new Set((res.items || []).map(f => f.owner_id).filter((v): v is string => !!v)));
  await Promise.all(ids.map(id => this.users.resolveUser(id)));
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
  const ids = Array.from(new Set((res.items || []).map(f => f.owner_id).filter((v): v is string => !!v)));
  await Promise.all(ids.map(id => this.users.resolveUser(id)));
  }

  async prev() {
    if (this.offset() <= 0) return;
    this.offset.update(o => Math.max(0, o - this.limit()));
    const res = await this.list();
    this.items.set(res.items || []);
    this.total.set(res.total || 0);
  const ids = Array.from(new Set((res.items || []).map(f => f.owner_id).filter((v): v is string => !!v)));
  await Promise.all(ids.map(id => this.users.resolveUser(id)));
  }

  async applyFilters() {
    this.offset.set(0);
    const res = await this.list();
    this.items.set(res.items || []);
    this.total.set(res.total || 0);
  const ids = Array.from(new Set((res.items || []).map(f => f.owner_id).filter((v): v is string => !!v)));
  await Promise.all(ids.map(id => this.users.resolveUser(id)));
  }

  onTypeChange(val: string) {
    const v = (val ?? '').trim();
    if (v === '' || v === 'image' || v === 'pdf' || v === 'document') {
      this.type_file.set(v as any);
      this.applyFilters();
    }
  }

  // Resolve user details for display (email/name) with caching, similar to Admin Messages
  async userLabel(userId: string | null | undefined): Promise<string> {
    if (!userId) return '';
    const u = await this.users.resolveUser(userId);
    if (!u) return userId;
    if (u.username && u.email) return `${u.username} <${u.email}>`;
    return u.email || u.username || userId;
  }
}
