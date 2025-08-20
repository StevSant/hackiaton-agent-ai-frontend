import { CommonModule } from '@angular/common';
import {
  Component,
  ElementRef,
  EventEmitter,
  Input,
  Output,
  ViewChild,
  inject,
  signal,
  OnInit,
  AfterViewInit,
  HostListener,
} from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { TranslateModule } from '@ngx-translate/core';
import { AnalyzeSessionCompaniesUseCase } from '@core/use-cases/sessions/analyze-session-companies.usecase';
import type { SessionCompaniesAnalysis } from '@core/models/session-analysis';
import { LazyChartComponent } from '@presentation/components/lazy-chart/lazy-chart.component';

@Component({
  selector: 'app-session-companies-charts-modal',
  standalone: true,
  imports: [CommonModule, MatIconModule, TranslateModule, LazyChartComponent],
  templateUrl: './session-companies-charts-modal.component.html',
  styleUrls: ['./session-companies-charts-modal.component.css'],
})
export class SessionCompaniesChartsModalComponent implements OnInit, AfterViewInit {
  @ViewChild('modalRoot', { static: false })
  modalRoot?: ElementRef<HTMLElement>;
  @ViewChild('closeBtn') closeBtn?: ElementRef<HTMLButtonElement>;

  @Input({ required: true }) sessionId!: string;
  @Output() closed = new EventEmitter<void>();

  readonly loading = signal(false);
  readonly data = signal<SessionCompaniesAnalysis | null>(null);
  readonly error = signal<string | null>(null);

  // Chart datasets
  readonly scoresChart = signal<{ type: string; data: any; options?: any } | null>(null);
  readonly sectorChart = signal<{ type: string; data: any; options?: any } | null>(null);
  readonly contribChart = signal<{ type: string; data: any; options?: any } | null>(null);

  private readonly analyze = inject(AnalyzeSessionCompaniesUseCase);

  ngOnInit(): void {
    if (!this.sessionId) return;
    this.loading.set(true);
    this.analyze.execute(this.sessionId).subscribe({
      next: (d) => {
        this.data.set(d);
        this.prepareCharts(d);
      },
      error: (e) => {
        this.error.set(e?.message || 'Error');
      },
      complete: () => this.loading.set(false),
    });
  }

  ngAfterViewInit() {
    queueMicrotask(() => this.closeBtn?.nativeElement?.focus());
  }

  onBackdropClick() {
    this.closed.emit();
  }

  @HostListener('document:keydown.escape')
  onEsc() {
    this.closed.emit();
  }

  onKeydown(event: KeyboardEvent) {
    if (event.key !== 'Tab') return;
    const root = this.modalRoot?.nativeElement;
    if (!root) return;
    const focusables = root.querySelectorAll<HTMLElement>(
      'a[href], button, textarea, input, select, [tabindex]:not([tabindex="-1"])',
    );
    if (!focusables.length) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    const active = document.activeElement as HTMLElement | null;
    if (event.shiftKey) {
      if (active === first) {
        last.focus();
        event.preventDefault();
      }
    } else if (active === last) {
      first.focus();
      event.preventDefault();
    }
  }

  private prepareCharts(d: SessionCompaniesAnalysis) {
    // Scores per company bar chart
    try {
      const labels = (d?.companies || []).map((c) => c?.tax_id || '—');
      const scores = (d?.companies || []).map((c) =>
        c?.dashboard && (c.dashboard as any)?.score?.score != null
          ? Number((c.dashboard as any).score.score)
          : null,
      );
      if (scores.some((s) => typeof s === 'number')) {
        this.scoresChart.set({
          type: 'bar',
          data: {
            labels,
            datasets: [
              {
                label: 'Score',
                data: scores,
                backgroundColor: 'rgba(59, 130, 246, 0.6)',
                borderColor: 'rgb(59, 130, 246)',
                borderWidth: 1,
              },
            ],
          },
          options: {
            responsive: true,
            plugins: { legend: { display: false } },
            scales: {
              y: { beginAtZero: true, suggestedMax: 100 },
            },
          },
        });
      }
    } catch {}

    // Sector comparison (if present) – treat as radar or grouped bar
    try {
      // Find first with sector_comparison object of key: number
      const first = (d?.companies || []).find((c) =>
        c?.dashboard && typeof (c.dashboard as any)?.sector_comparison === 'object',
      ) as any;
      const sector = first?.dashboard?.sector_comparison as Record<string, number> | undefined;
      if (sector && Object.keys(sector).length) {
        const labels = Object.keys(sector);
        const values = labels.map((k) => Number(sector[k] ?? 0));
        this.sectorChart.set({
          type: 'radar',
          data: {
            labels,
            datasets: [
              {
                label: 'Sector',
                data: values,
                backgroundColor: 'rgba(34,197,94,0.35)',
                borderColor: 'rgb(34,197,94)',
              },
            ],
          },
          options: { responsive: true },
        });
      }
    } catch {}

    // Contributions – build top factors bar (if object or array is provided)
    try {
      const first = (d?.companies || []).find((c) =>
        c?.dashboard && (c.dashboard as any)?.contributions,
      ) as any;
      const contrib = first?.dashboard?.contributions;
      let items: Array<{ key: string; value: number }> = [];
      if (Array.isArray(contrib)) {
        items = contrib
          .map((x: any) => ({ key: String(x?.name ?? x?.key ?? 'factor'), value: Number(x?.value ?? x?.score ?? 0) }))
          .filter((x) => Number.isFinite(x.value));
      } else if (contrib && typeof contrib === 'object') {
        items = Object.keys(contrib)
          .map((k) => ({ key: k, value: Number((contrib as any)[k] ?? 0) }))
          .filter((x) => Number.isFinite(x.value));
      }
      items = items.sort((a, b) => Math.abs(b.value) - Math.abs(a.value)).slice(0, 8);
      if (items.length) {
        this.contribChart.set({
          type: 'bar',
          data: {
            labels: items.map((i) => i.key),
            datasets: [
              {
                label: 'Contribución',
                data: items.map((i) => i.value),
                backgroundColor: 'rgba(234,179,8,0.6)',
                borderColor: 'rgb(234,179,8)',
              },
            ],
          },
          options: {
            indexAxis: 'y',
            responsive: true,
            plugins: { legend: { display: false } },
          },
        });
      }
    } catch {}
  }
}
