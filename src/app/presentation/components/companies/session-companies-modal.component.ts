import { CommonModule } from '@angular/common';
import { Component, ElementRef, EventEmitter, Input, Output, ViewChild, inject, signal, OnInit, AfterViewInit } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { TranslateModule } from '@ngx-translate/core';
import type { SessionCompaniesAnalysis } from '@core/models/session-analysis';
import { AnalyzeSessionCompaniesUseCase } from '@core/use-cases/sessions/analyze-session-companies.usecase';

@Component({
  selector: 'app-session-companies-modal',
  standalone: true,
  imports: [CommonModule, MatIconModule, TranslateModule],
  templateUrl: './session-companies-modal.component.html',
  styleUrls: ['./session-companies-modal.component.css']
})
export class SessionCompaniesModalComponent implements OnInit, AfterViewInit {
  @ViewChild('modalRoot', { static: false }) modalRoot?: ElementRef<HTMLElement>;
  @Input({ required: true }) sessionId!: string;
  @Output() closed = new EventEmitter<void>();

  readonly loading = signal(false);
  readonly data = signal<SessionCompaniesAnalysis | null>(null);
  readonly error = signal<string | null>(null);

  private readonly analyze = inject(AnalyzeSessionCompaniesUseCase);

  ngOnInit(): void {
    if (!this.sessionId) return;
    this.loading.set(true);
    this.analyze.execute(this.sessionId).subscribe({
      next: (d) => { this.data.set(d); },
      error: (e) => { this.error.set(e?.message || 'Error'); },
      complete: () => { this.loading.set(false); }
    });
  }

  trackByTaxId = (_: number, item: any) => item?.tax_id || _;
  isEmpty(obj: any) { return !obj || (Array.isArray(obj) ? obj.length === 0 : Object.keys(obj).length === 0); }

  onBackdropClick() { this.closed.emit(); }
  @ViewChild('closeBtn') closeBtn?: ElementRef<HTMLButtonElement>;
  ngAfterViewInit() { queueMicrotask(() => this.closeBtn?.nativeElement?.focus()); }
}
