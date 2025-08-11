import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule, ReactiveFormsModule, FormGroup } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { TranslateModule } from '@ngx-translate/core';
import type { UploadedFileMeta } from '@core/ports';

@Component({
  selector: 'app-chat-composer',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatIconModule,
    TranslateModule,
  ],
  templateUrl: './composer.component.html',
  styleUrls: ['./composer.component.css'],
})
export class ChatComposerComponent {
  @Input() form!: FormGroup;
  @Input() isSending = false;
  @Input() filesCount = 0;
  @Input() isUploadingFiles = false;
  @Input() uploadedFiles: UploadedFileMeta[] = [];
  // When false, file attach UI is disabled (e.g., on brand new chat before first message)
  @Input() allowUpload: boolean = true;
  @Output() send = new EventEmitter<void>();
  @Output() cancel = new EventEmitter<void>();
  @Output() filesSelected = new EventEmitter<Event>();
  @Output() filesDropped = new EventEmitter<File[]>();
  @Output() removeUploadedFile = new EventEmitter<UploadedFileMeta>();
  @Output() keydown = new EventEmitter<KeyboardEvent>();
  @Output() composerInput = new EventEmitter<Event>();

  // Drag & Drop state
  dragging = false;
  private dragCounter = 0;

  onSubmit() {
    // Hard guard: do not emit send if uploading files, already sending, or form invalid
    if (this.isUploadingFiles || this.isSending || !this.form?.valid) {
      return;
    }
    this.send.emit();
  }
  onCancel() {
    this.cancel.emit();
  }
  onRemove(file: UploadedFileMeta, e?: Event) {
    e?.preventDefault();
    e?.stopPropagation();
    this.removeUploadedFile.emit(file);
  }

  onDragEnter(e: DragEvent) {
    if (!this.allowUpload || !e) return;
    const hasFiles =
      !!e.dataTransfer &&
      Array.from(e.dataTransfer.types || []).includes('Files');
    if (!hasFiles) return;
    e.preventDefault();
    e.stopPropagation();
    this.dragCounter++;
    this.dragging = true;
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
  }

  onDragOver(e: DragEvent) {
    if (!this.allowUpload) return; // block when uploads are not allowed
    if (!e) return;
    // Only react to file drags
    const hasFiles =
      !!e.dataTransfer &&
      Array.from(e.dataTransfer.types || []).includes('Files');
    if (!hasFiles) return;
    e.preventDefault();
    e.stopPropagation();
    this.dragging = true;
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
  }

  onDragLeave(e: DragEvent) {
    if (!e) return;
    e.preventDefault();
    e.stopPropagation();
    // Use counter to avoid flicker when overlay/dom changes
    if (this.dragCounter > 0) this.dragCounter--;
    if (this.dragCounter <= 0) {
      this.dragCounter = 0;
      this.dragging = false;
    }
  }

  onDrop(e: DragEvent) {
    if (!this.allowUpload) return;
    if (!e) return;
    e.preventDefault();
    e.stopPropagation();
    this.dragging = false;
    this.dragCounter = 0;
    const files = Array.from(e.dataTransfer?.files || []);
    if (files.length) {
      this.filesDropped.emit(files);
    }
  }
}
