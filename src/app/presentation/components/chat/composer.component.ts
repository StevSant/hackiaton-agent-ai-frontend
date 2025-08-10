import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule, ReactiveFormsModule, FormGroup } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { TranslateModule } from '@ngx-translate/core';
import type { UploadedFileMeta } from '@core/ports';

@Component({
  selector: 'app-chat-composer',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, MatIconModule, TranslateModule],
  templateUrl: './composer.component.html',
  styleUrls: ['./composer.component.css']
})
export class ChatComposerComponent {
  @Input() form!: FormGroup;
  @Input() isSending = false;
  @Input() filesCount = 0;
  @Input() uploadedFiles: UploadedFileMeta[] = [];
  @Output() send = new EventEmitter<void>();
  @Output() cancel = new EventEmitter<void>();
  @Output() filesSelected = new EventEmitter<Event>();
  @Output() keydown = new EventEmitter<KeyboardEvent>();
  @Output() composerInput = new EventEmitter<Event>();

  onSubmit() { this.send.emit(); }
  onCancel() { this.cancel.emit(); }
}
