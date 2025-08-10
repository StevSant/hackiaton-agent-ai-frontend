import { CommonModule } from '@angular/common';
import { Component, ElementRef, EventEmitter, HostListener, Input, OnInit, Output, ViewChild, inject, signal, AfterViewInit } from '@angular/core';
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
export class SessionFilesModalComponent implements OnInit, AfterViewInit {
  @ViewChild('modalRoot', { static: false }) modalRoot?: ElementRef<HTMLElement>;
  @Input({ required: true }) sessionId!: string;
  @Output() closed = new EventEmitter<void>();
  readonly loading = signal(false);
  readonly files = signal<UploadedFileMeta[]>([]);

  private readonly listSessionFiles: ListSessionFilesUseCase = inject(ListSessionFilesUseCase);

  ngOnInit(): void {
    if (!this.sessionId) return;
    this.loading.set(true);
    this.loadFiles();
  }

  private async loadFiles() {
    try {
      const items = await this.listSessionFiles.execute(this.sessionId);
      this.files.set(items ?? []);
    } finally {
      this.loading.set(false);
    }
  }

  isImage(f: UploadedFileMeta) { return f.type_file === 'image'; }
  isPdf(f: UploadedFileMeta) { return f.type_file === 'pdf'; }
  open(url: string) { window.open(url, '_blank', 'noopener'); }
  onBackdropClick() { this.closed.emit(); }

  // Basic focus trap to keep TAB inside modal
  onKeydown(event: KeyboardEvent) {
    if (event.key !== 'Tab') return;
    const root = this.modalRoot?.nativeElement; if (!root) return;
    const focusables = root.querySelectorAll<HTMLElement>(
      'a[href], button, textarea, input, select, [tabindex]:not([tabindex="-1"])'
    );
    if (!focusables.length) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    const active = document.activeElement as HTMLElement | null;
    if (event.shiftKey) {
      if (active === first) { last.focus(); event.preventDefault(); }
  } else if (active === last) { first.focus(); event.preventDefault(); }
  }

  ngAfterViewInit() {
    // Move initial focus to close button for accessibility
    const closeBtn = this.modalRoot?.nativeElement.querySelector('button');
    (closeBtn as HTMLElement | null)?.focus?.();
  }

  @HostListener('document:keydown.escape')
  onEsc() {
    this.closed.emit();
  }
}
