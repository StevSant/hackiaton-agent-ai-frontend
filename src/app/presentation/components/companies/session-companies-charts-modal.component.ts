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
  readonly scenariosChart = signal<{ type: string; data: any; options?: any } | null>(null);
  readonly riskChart = signal<{ type: string; data: any; options?: any } | null>(null);

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
    this.prepareScoresChart(d);
    this.prepareContributionsChart(d);
    this.prepareScenariosChart(d);
    this.prepareRiskAnalysisChart(d);
    this.prepareSectorChart(d);
  }

  private prepareScoresChart(d: SessionCompaniesAnalysis) {
    try {
      const companies = d?.companies || [];
      if (!companies.length) return;

      const labels = companies.map((c, index) => 
        c?.dashboard?.company?.legal_name ||
        c?.dashboard?.company?.name ||
        c?.tax_id ||
        `Empresa ${index + 1}`
      );
      
      const scores = companies.map((c) => {
        const raw = c?.dashboard?.score?.score;
        if (raw == null || isNaN(Number(raw))) return 0;
        const n = Number(raw);
        return n <= 1 ? Math.round(n * 1000) / 10 : Math.round(n * 10) / 10;
      });

      this.scoresChart.set({
        type: 'bar',
        data: {
          labels,
          datasets: [{
            label: 'Score de Riesgo (%)',
            data: scores,
            backgroundColor: 'rgba(59, 130, 246, 0.8)',
            borderColor: 'rgba(59, 130, 246, 1)',
            borderWidth: 2,
            borderRadius: 8,
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: true,
              position: 'top'
            }
          },
          scales: {
            y: {
              beginAtZero: true,
              max: 100
            }
          }
        }
      });
    } catch (error) {
      console.error('Error preparing scores chart:', error);
    }
  }

  private prepareContributionsChart(d: SessionCompaniesAnalysis) {
    // Chart de contribuciones básico por ahora
    this.contribChart.set({
      type: 'bar',
      data: {
        labels: ['Datos', 'Análisis'],
        datasets: [{
          label: 'Contribuciones',
          data: [50, 75],
          backgroundColor: 'rgba(16, 185, 129, 0.8)'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false
      }
    });
  }

  private prepareScenariosChart(d: SessionCompaniesAnalysis) {
    // Chart de escenarios básico
    this.scenariosChart.set({
      type: 'line',
      data: {
        labels: ['Pesimista', 'Realista', 'Optimista'],
        datasets: [{
          label: 'Escenarios',
          data: [30, 60, 90],
          backgroundColor: 'rgba(245, 158, 11, 0.3)',
          borderColor: 'rgba(245, 158, 11, 1)',
          tension: 0.4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false
      }
    });
  }

  private prepareRiskAnalysisChart(d: SessionCompaniesAnalysis) {
    // Chart de análisis de riesgo básico
    this.riskChart.set({
      type: 'doughnut',
      data: {
        labels: ['Bajo', 'Medio', 'Alto'],
        datasets: [{
          data: [60, 30, 10],
          backgroundColor: [
            'rgba(34, 197, 94, 0.8)',
            'rgba(245, 158, 11, 0.8)',
            'rgba(239, 68, 68, 0.8)'
          ]
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false
      }
    });
  }

  private prepareSectorChart(d: SessionCompaniesAnalysis) {
    // Chart sectorial básico
    this.sectorChart.set({
      type: 'bar',
      data: {
        labels: ['Mi Empresa', 'Promedio Sector'],
        datasets: [{
          label: 'Comparación Sectorial',
          data: [75, 65],
          backgroundColor: ['rgba(147, 51, 234, 0.8)', 'rgba(99, 102, 241, 0.8)']
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false
      }
    });
  }
}
