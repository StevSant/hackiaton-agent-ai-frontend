import { CommonModule } from '@angular/common';
import { Component, EventEmitter, HostListener, Input, OnInit, Output, inject, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { TranslateModule } from '@ngx-translate/core';
import type { UploadedFileMeta } from '@core/ports';
import { ListSessionFilesUseCase } from '@core/use-cases/files/list-session-files.usecase';

@Component({
  selector: 'app-session-files-modal',
  standalone: true,
  imports: [CommonModule, MatIconModule, TranslateModule],
  templateUrl: './session-files-modal.component.html',
  styleUrls: ['./session-files-modal.component.css']
})
export class SessionFilesModalComponent implements OnInit {
  @Input({ required: true }) sessionId!: string;
  @Output() closed = new EventEmitter<void>();
  readonly loading = signal(false);
  readonly files = signal<UploadedFileMeta[]>([]);

  private readonly listSessionFiles: ListSessionFilesUseCase = inject(ListSessionFilesUseCase);

  async ngOnInit() {
    if (!this.sessionId) return;
    this.loading.set(true);
    try {
      const items = await this.listSessionFiles.execute(this.sessionId);
      this.files.set((items ?? []) as UploadedFileMeta[]);
    } finally {
      this.loading.set(false);
    }
  }

  isImage(f: UploadedFileMeta) { return f.type_file === 'image'; }
  isPdf(f: UploadedFileMeta) { return f.type_file === 'pdf'; }
  open(url: string) { window.open(url, '_blank', 'noopener'); }
  onBackdropClick() { this.closed.emit(); }

  @HostListener('document:keydown.escape')
  onEsc() {
    this.closed.emit();
  }
}
