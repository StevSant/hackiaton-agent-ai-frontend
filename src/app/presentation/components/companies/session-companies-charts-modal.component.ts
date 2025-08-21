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
  readonly socialChart = signal<{ type: string; data: any; options?: any } | null>(null);

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
    this.prepareSocialNetworksChart(d);
  }

  private prepareScoresChart(d: SessionCompaniesAnalysis) {
    try {
      const companies = d?.companies || [];
      if (!companies.length) return;

      const labels = companies.map((c, index) => this.companyLabel(c, index));

      const scoresPct = companies.map((c) => {
        const raw = (c as any)?.dashboard?.score?.score;
        const n = Number(raw);
        if (!isFinite(n)) return 0;
        return n <= 1 ? Math.round(n * 1000) / 10 : Math.round(n * 10) / 10; // % if <= 1 else number
      });

      const creditLimits = companies.map((c) => {
        const v = Number((c as any)?.dashboard?.score?.recommended_credit_limit);
        return isFinite(v) ? v : 0;
      });

      this.scoresChart.set({
        type: 'bar',
        data: {
          labels,
          datasets: [
            {
              label: 'Score de Riesgo (%)',
              data: scoresPct,
              backgroundColor: 'rgba(59, 130, 246, 0.8)',
              borderColor: 'rgba(59, 130, 246, 1)',
              borderWidth: 2,
              borderRadius: 8,
              yAxisID: 'y',
            },
            {
              type: 'line',
              label: 'Límite de Crédito (USD)',
              data: creditLimits,
              borderColor: 'rgba(16, 185, 129, 1)',
              backgroundColor: 'rgba(16, 185, 129, 0.25)',
              borderWidth: 2,
              tension: 0.35,
              pointBackgroundColor: 'rgba(16, 185, 129, 1)',
              pointRadius: 4,
              yAxisID: 'y1',
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: true, position: 'top' },
            tooltip: {
              callbacks: {
                label: (ctx: any) => {
                  const label = ctx.dataset?.label || '';
                  const val = ctx.parsed?.y;
                  if (label.includes('Score')) return `${label}: ${val}%`;
                  if (label.includes('Crédito')) return `${label}: $${Number(val).toLocaleString()}`;
                  return `${label}: ${val}`;
                },
              },
            },
          },
          scales: {
            y: { beginAtZero: true, max: 100, title: { display: true, text: '%' } },
            y1: {
              beginAtZero: true,
              position: 'right',
              grid: { drawOnChartArea: false },
              title: { display: true, text: 'USD' },
            },
          },
        },
      });
    } catch (error) {
      console.error('Error preparing scores chart:', error);
    }
  }

  private prepareContributionsChart(d: SessionCompaniesAnalysis) {
    try {
      const companies = d?.companies || [];
      if (!companies.length) return;

      // Collect union of dimensions and compute average to pick top N for readability
      const dimSet = new Map<string, number>();
      companies.forEach((c) => {
        const breakdown = (c as any)?.dashboard?.score?.dimension_breakdown || {};
        Object.entries(breakdown).forEach(([k, v]) => {
          const n = Number(v) || 0;
          dimSet.set(k, (dimSet.get(k) || 0) + n);
        });
      });
      const dimsSorted = Array.from(dimSet.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([k]) => k);
      const topDims = dimsSorted.slice(0, 8); // limit to top 8

      const labels = topDims;
      const palette = this.palette();
      const datasets = companies.map((c, idx) => {
        const breakdown: any = (c as any)?.dashboard?.score?.dimension_breakdown || {};
        const data = labels.map((dim) => {
          const n = Number(breakdown?.[dim]);
          return isFinite(n) ? n : 0;
        });
        return {
          label: this.companyLabel(c, idx),
          data,
          backgroundColor: palette[idx % palette.length] + 'CC',
          borderColor: palette[idx % palette.length],
          borderWidth: 1.5,
        };
      });

      this.contribChart.set({
        type: 'bar',
        data: { labels, datasets },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          indexAxis: 'y',
          scales: {
            x: { beginAtZero: true, title: { display: true, text: 'Aporte (relativo)' } },
          },
        },
      });
    } catch (error) {
      console.error('Error preparing contributions chart:', error);
    }
  }

  private prepareScenariosChart(d: SessionCompaniesAnalysis) {
    try {
      const companies = d?.companies || [];
      if (!companies.length) return;

      const labels = companies.map((c, i) => this.companyLabel(c, i));

      // Build dataset for current score and for each scenario name
      const currentScores = companies.map((c) => {
        const s = Number((c as any)?.dashboard?.score?.score);
        if (!isFinite(s)) return 0;
        return s <= 1 ? Math.round(s * 1000) / 10 : Math.round(s * 10) / 10;
      });

      // Union of scenario names across companies (keep order of first appearance)
      const scenarioNames: string[] = [];
      companies.forEach((c) => {
        const scs = ((c as any)?.dashboard?.scenarios as Array<any>) || [];
        scs.forEach((s) => {
          const name = s?.name || 'Escenario';
          if (!scenarioNames.includes(name)) scenarioNames.push(name);
        });
      });

      const palette = this.palette();
      const datasets: any[] = [
        {
          label: 'Actual (%)',
          data: currentScores,
          backgroundColor: 'rgba(147, 51, 234, 0.25)',
          borderColor: 'rgba(147, 51, 234, 1)',
          borderWidth: 2,
          tension: 0.35,
        },
      ];

      scenarioNames.forEach((name, idx) => {
        const series = companies.map((c) => {
          const scs = ((c as any)?.dashboard?.scenarios as Array<any>) || [];
          const found = scs.find((s) => s?.name === name);
          const n = Number(found?.new_score);
          if (!isFinite(n)) return 0;
          return n <= 1 ? Math.round(n * 1000) / 10 : Math.round(n * 10) / 10;
        });
        datasets.push({
          label: name,
          data: series,
          backgroundColor: palette[(idx + 2) % palette.length] + '33',
          borderColor: palette[(idx + 2) % palette.length],
          borderWidth: 2,
          tension: 0.35,
          pointRadius: 4,
        });
      });

      this.scenariosChart.set({
        type: 'line',
        data: { labels, datasets },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: true, position: 'top' } },
          scales: { y: { beginAtZero: true, max: 100, title: { display: true, text: '%' } } },
        },
      });
    } catch (error) {
      console.error('Error preparing scenarios chart:', error);
    }
  }

  private prepareRiskAnalysisChart(d: SessionCompaniesAnalysis) {
    try {
      const companies = d?.companies || [];
      if (!companies.length) return;

      const counts = new Map<string, number>([
        ['Riesgo Bajo', 0],
        ['Riesgo Medio', 0],
        ['Riesgo Alto', 0],
      ]);
      companies.forEach((c) => {
        const label = (c as any)?.dashboard?.score?.risk_class || (c as any)?.dashboard?.company?.risk_level;
        if (typeof label === 'string') {
          let key: string | null = null;
          if (['Riesgo Bajo', 'Bajo'].includes(label)) {
            key = 'Riesgo Bajo';
          } else if (['Riesgo Medio', 'Medio'].includes(label)) {
            key = 'Riesgo Medio';
          } else if (['Riesgo Alto', 'Alto'].includes(label)) {
            key = 'Riesgo Alto';
          }
          if (key) counts.set(key, (counts.get(key) || 0) + 1);
        }
      });
      const labels = Array.from(counts.keys());
      const data = labels.map((l) => counts.get(l) || 0);

      this.riskChart.set({
        type: 'doughnut',
        data: {
          labels,
          datasets: [
            {
              data,
              backgroundColor: [
                'rgba(34, 197, 94, 0.8)',
                'rgba(245, 158, 11, 0.8)',
                'rgba(239, 68, 68, 0.8)',
              ],
              borderWidth: 1,
            },
          ],
        },
        options: { responsive: true, maintainAspectRatio: false },
      });
    } catch (error) {
      console.error('Error preparing risk analysis chart:', error);
    }
  }

  private prepareSectorChart(d: SessionCompaniesAnalysis) {
    try {
      const companies = d?.companies || [];
      if (!companies.length) return;

      // Build union of dimensions
      const dimSet = new Set<string>();
      companies.forEach((c) => {
        const breakdown = (c as any)?.dashboard?.score?.dimension_breakdown || {};
        Object.keys(breakdown).forEach((k) => dimSet.add(k));
      });
      const allDims = Array.from(dimSet);
      // Limit to top 10 by average value to keep radar readable
      const avgMap = new Map<string, number>();
      companies.forEach((c) => {
        const breakdown: any = (c as any)?.dashboard?.score?.dimension_breakdown || {};
        allDims.forEach((k) => {
          const n = Number(breakdown?.[k]);
          avgMap.set(k, (avgMap.get(k) || 0) + (isFinite(n) ? n : 0));
        });
      });
      const dims = Array.from(avgMap.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([k]) => k);

      const palette = this.palette();
      const datasets = companies.map((c, idx) => {
        const breakdown: any = (c as any)?.dashboard?.score?.dimension_breakdown || {};
        const data = dims.map((k) => {
          const n = Number(breakdown?.[k]);
          return isFinite(n) ? n : 0;
        });
        return {
          label: this.companyLabel(c, idx),
          data,
          backgroundColor: palette[idx % palette.length] + '33',
          borderColor: palette[idx % palette.length],
          pointBackgroundColor: palette[idx % palette.length],
          borderWidth: 2,
        };
      });

      this.sectorChart.set({
        type: 'radar',
        data: { labels: dims, datasets },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            r: {
              beginAtZero: true,
              angleLines: { color: 'rgba(0,0,0,0.1)' },
              grid: { color: 'rgba(0,0,0,0.1)' },
            },
          },
          plugins: { legend: { display: true, position: 'top' } },
        },
      });
    } catch (error) {
      console.error('Error preparing sector/multidimensional chart:', error);
    }
  }

  private prepareSocialNetworksChart(d: SessionCompaniesAnalysis) {
    try {
      const companies = d?.companies || [];
      if (!companies.length) return;

      // Extraer datos de redes sociales
      const socialData = companies.map(company => {
        const socialNetworks = (company as any)?.social_networks;
        const companyName = this.companyLabel(company, 0);

        return {
          name: companyName,
          totalFollowers: socialNetworks?.summary?.total_followers || 0,
          totalPlatforms: socialNetworks?.total_platforms || 0,
          successfulPlatforms: socialNetworks?.successful_platforms || 0,
          verifiedAccounts: socialNetworks?.summary?.verified_accounts || 0,
          avgEngagement: socialNetworks?.summary?.average_engagement || 0,
        };
      });

      // Crear gráfico combinado que muestre tanto seguidores como plataformas
      this.socialChart.set({
        type: 'bar',
        data: {
          labels: socialData.map(item => item.name),
          datasets: [
            {
              label: '👥 Seguidores (Miles)',
              data: socialData.map(item => Math.round(item.totalFollowers / 1000)),
              backgroundColor: 'rgba(59, 130, 246, 0.8)',
              borderColor: 'rgba(59, 130, 246, 1)',
              borderWidth: 2,
              yAxisID: 'y',
              borderRadius: 8,
            },
            {
              label: '📱 Plataformas Activas',
              data: socialData.map(item => item.successfulPlatforms),
              backgroundColor: 'rgba(16, 185, 129, 0.8)',
              borderColor: 'rgba(16, 185, 129, 1)',
              borderWidth: 2,
              yAxisID: 'y1',
              type: 'line',
              tension: 0.4,
              pointBackgroundColor: 'rgba(16, 185, 129, 1)',
              pointBorderColor: '#ffffff',
              pointBorderWidth: 2,
              pointRadius: 6,
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: true,
              position: 'top',
              labels: {
                usePointStyle: true,
                padding: 20
              }
            },
            tooltip: {
              callbacks: {
                label: (context: any) => {
                  const datasetLabel = context.dataset.label;
                  const value = context.parsed.y;
                  if (datasetLabel?.includes('Seguidores')) {
                    return `${datasetLabel}: ${value}K`;
                  }
                  return `${datasetLabel}: ${value}`;
                }
              }
            }
          },
          scales: {
            x: {
              grid: {
                drawBorder: false
              }
            },
            y: {
              type: 'linear',
              display: true,
              position: 'left',
              beginAtZero: true,
              title: {
                display: true,
                text: 'Seguidores (Miles)',
              }
            },
            y1: {
              type: 'linear',
              display: true,
              position: 'right',
              beginAtZero: true,
              title: {
                display: true,
                text: 'Número de Plataformas',
              },
              grid: {
                drawOnChartArea: false,
              }
            }
          }
        }
      });
    } catch (error) {
      console.error('Error preparing social networks chart:', error);
    }
  }

  // Helpers
  private companyLabel(company: any, index: number): string {
    const c = company?.dashboard?.company ?? company?.company ?? {};
    return (
      c.business_name ||
      c.legal_name ||
      c.name ||
      company?.tax_id ||
      `Empresa ${index + 1}`
    );
  }

  private palette(): string[] {
    // Vibrant, accessible palette (solid colors). Append alpha like + '33' when needed
    return [
      '#3B82F6', // blue-500
      '#10B981', // emerald-500
      '#F59E0B', // amber-500
      '#EF4444', // red-500
      '#8B5CF6', // violet-500
      '#06B6D4', // cyan-500
      '#22C55E', // green-500
      '#F97316', // orange-500
      '#E11D48', // rose-600
      '#0EA5E9', // sky-500
    ];
  }
}
