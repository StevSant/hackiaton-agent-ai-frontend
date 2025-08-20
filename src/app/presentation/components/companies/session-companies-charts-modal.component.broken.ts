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
import { ThemeService } from '@infrastructure/services/theme.service';
import { firstValueFrom } from 'rxjs';

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

  // Chart datasets - Enhanced with new charts
  readonly scoresChart = signal<{ type: string; data: any; options?: any } | null>(null);
  readonly sectorChart = signal<{ type: string; data: any; options?: any } | null>(null);
  readonly contribChart = signal<{ type: string; data: any; options?: any } | null>(null);
  readonly scenariosChart = signal<{ type: string; data: any; options?: any } | null>(null);
  readonly riskChart = signal<{ type: string; data: any; options?: any } | null>(null);

  private readonly analyze = inject(AnalyzeSessionCompaniesUseCase);
  private readonly themeService = inject(ThemeService);

  ngOnInit(): void {
    if (!this.sessionId) return;
    this.loadData();
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      this.closeBtn?.nativeElement?.focus();
    }, 100);
  }

  @HostListener('keydown', ['$event'])
  onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      this.close();
    } else if (event.key === 'Tab') {
      this.handleTabKey(event);
    }
  }

  close(): void {
    this.closed.emit();
  }

  private async loadData(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    
    try {
      const result = await firstValueFrom(this.analyze.execute(this.sessionId));
      if (result) {
        this.data.set(result);
        this.prepareCharts(result);
      }
    } catch (error) {
      console.error('Error loading companies analysis:', error);
      this.error.set('Error al cargar el análisis de empresas');
    } finally {
      this.loading.set(false);
    }
  }

  private handleTabKey(event: KeyboardEvent): void {
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

  // Helper methods for theme-aware styling
  private getThemeColors() {
    const isDark = this.themeService.isDark();
    return {
      textColor: isDark ? 'rgba(248, 250, 252, 0.9)' : 'rgba(30, 41, 59, 0.9)',
      gridColor: isDark ? 'rgba(71, 85, 105, 0.3)' : 'rgba(148, 163, 184, 0.3)',
      backgroundColor: isDark ? 'rgba(15, 23, 42, 0.8)' : 'rgba(248, 250, 252, 0.8)',
      tooltipBg: isDark ? 'rgba(15, 23, 42, 0.95)' : 'rgba(248, 250, 252, 0.95)',
      borderColor: isDark ? 'rgba(71, 85, 105, 0.5)' : 'rgba(148, 163, 184, 0.5)'
    };
  }

  private getCompanyColors() {
    const isDark = this.themeService.isDark();
    return isDark ? [
      'rgba(129, 140, 248, 0.8)', // Indigo
      'rgba(96, 165, 250, 0.8)',  // Blue  
      'rgba(52, 211, 153, 0.8)',  // Emerald
      'rgba(251, 191, 36, 0.8)',  // Amber
      'rgba(248, 113, 113, 0.8)', // Red
      'rgba(196, 181, 253, 0.8)', // Violet
      'rgba(251, 146, 60, 0.8)'   // Orange
    ] : [
      'rgba(99, 102, 241, 0.8)',  // Indigo
      'rgba(59, 130, 246, 0.8)',  // Blue
      'rgba(16, 185, 129, 0.8)',  // Emerald
      'rgba(245, 158, 11, 0.8)',  // Amber
      'rgba(239, 68, 68, 0.8)',   // Red
      'rgba(147, 51, 234, 0.8)',  // Violet
      'rgba(249, 115, 22, 0.8)'   // Orange
    ];
  }

  private getRiskColors(riskClass?: string) {
    const isDark = this.themeService.isDark();
    
    if (!riskClass) return isDark ? 'rgba(100, 116, 139, 0.8)' : 'rgba(148, 163, 184, 0.8)';
    
    if (riskClass.includes('Bajo')) {
      return isDark ? 'rgba(74, 222, 128, 0.8)' : 'rgba(34, 197, 94, 0.8)';
    }
    if (riskClass.includes('Medio')) {
      return isDark ? 'rgba(250, 204, 21, 0.8)' : 'rgba(234, 179, 8, 0.8)';
    }
    if (riskClass.includes('Alto')) {
      return isDark ? 'rgba(248, 113, 113, 0.8)' : 'rgba(239, 68, 68, 0.8)';
    }
    
    return isDark ? 'rgba(100, 116, 139, 0.8)' : 'rgba(148, 163, 184, 0.8)';
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

      const theme = this.getThemeColors();
      const companyColors = this.getCompanyColors();

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

      const creditLimits = companies.map((c) => {
        const limit = c?.dashboard?.score?.recommended_credit_limit;
        return limit ? Number(limit) / 1000 : 0; // En miles
      });

      const riskColors = companies.map((c) => {
        const riskClass = c?.dashboard?.score?.risk_class;
        return this.getRiskColors(riskClass);
      });

      this.scoresChart.set({
        type: 'bar',
        data: {
          labels,
          datasets: [
            {
              label: '📊 Score de Riesgo (%)',
              data: scores,
              backgroundColor: riskColors,
              borderColor: riskColors.map(color => color.replace('0.8', '1')),
              borderWidth: 2,
              borderRadius: 8,
              borderSkipped: false,
              yAxisID: 'y'
            },
            {
              label: '💰 Límite de Crédito (K$)',
              data: creditLimits,
              backgroundColor: 'transparent',
              borderColor: companyColors[4], // Orange/Red for contrast
              borderWidth: 3,
              type: 'line',
              yAxisID: 'y1',
              tension: 0.4,
              pointBackgroundColor: companyColors[4],
              pointBorderColor: theme.backgroundColor,
              pointBorderWidth: 3,
              pointRadius: 6,
              pointHoverRadius: 9,
              pointHoverBorderWidth: 4
            }
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          interaction: {
            mode: 'index' as const,
            intersect: false,
          },
          plugins: {
            legend: {
              display: true,
              position: 'top' as const,
              labels: {
                color: theme.textColor,
                font: { size: 13, weight: '600' },
                usePointStyle: true,
                padding: 20,
                boxWidth: 12,
                boxHeight: 12
              }
            },
            title: {
              display: true,
              text: '📈 Análisis Comparativo: Score vs Límite de Crédito',
              font: { size: 16, weight: '700' },
              color: theme.textColor,
              padding: { bottom: 25 }
            },
            tooltip: {
              backgroundColor: theme.tooltipBg,
              titleColor: theme.textColor,
              bodyColor: theme.textColor,
              borderColor: theme.borderColor,
              borderWidth: 1,
              cornerRadius: 12,
              padding: 12,
              displayColors: true,
              callbacks: {
                title: (ctx: any) => `${ctx[0].label}`,
                label: (ctx: any) => {
                  if (ctx.datasetIndex === 0) {
                    const company = companies[ctx.dataIndex];
                    const riskClass = company?.dashboard?.score?.risk_class || 'N/A';
                    return `Score: ${ctx.parsed.y}% • Riesgo: ${riskClass}`;
                  }
                  return `Límite Crédito: $${(ctx.parsed.y * 1000).toLocaleString()}`;
                },
              },
            },
          },
          scales: {
            x: {
              grid: { 
                display: false 
              },
              ticks: { 
                color: theme.textColor,
                font: { size: 11, weight: '500' },
                maxRotation: 45
              }
            },
            y: {
              type: 'linear' as const,
              display: true,
              position: 'left' as const,
              title: {
                display: true,
                text: 'Score (%)',
                color: theme.textColor,
                font: { size: 12, weight: '600' }
              },
              grid: {
                color: theme.gridColor,
                lineWidth: 1
              },
              ticks: {
                color: theme.textColor,
                font: { size: 11 },
                callback: function(value: any) {
                  return `${value}%`;
                }
              }
            },
            y1: {
              type: 'linear' as const,
              display: true,
              position: 'right' as const,
              title: {
                display: true,
                text: 'Límite Crédito (K$)',
                color: theme.textColor,
                font: { size: 12, weight: '600' }
              },
              grid: {
                drawOnChartArea: false,
              },
              ticks: {
                color: theme.textColor,
                font: { size: 11 },
                callback: function(value: any) {
                  return `$${value}K`;
                }
              }
            }
          }
        }
      });
    } catch (error) {
      console.error('Error preparing scores chart:', error);
    }
  }

  private prepareContributionsChart(d: SessionCompaniesAnalysis) {
    try {
      const companies = d?.companies || [];
      if (!companies.length) return;

      const theme = this.getThemeColors();
      const companyColors = this.getCompanyColors();

      // Obtener todas las dimensiones únicas de contribuciones
      const allDimensions = new Set<string>();
      companies.forEach(company => {
        const contributions = company?.dashboard?.contributions || [];
        contributions.forEach((contrib: any) => {
          const dimension = contrib?.dimension || contrib?.name || contrib?.key;
          if (dimension) allDimensions.add(dimension);
        });
      });

      if (!allDimensions.size) return;

      const dimensions = Array.from(allDimensions);
      const datasets = companies.map((company, index) => {
        const companyName = company?.dashboard?.company?.legal_name ||
                           company?.dashboard?.company?.name ||
                           company?.tax_id ||
                           `Empresa ${index + 1}`;
        
        const contributions = company?.dashboard?.contributions || [];
        const data = dimensions.map(dim => {
          const contrib = contributions.find((c: any) => 
            (c?.dimension || c?.name || c?.key) === dim
          );
          const value = contrib?.value || contrib?.score || contrib?.percentage || 0;
          return typeof value === 'number' ? value : parseFloat(String(value)) || 0;
        });

        return {
          label: companyName,
          data,
          backgroundColor: companyColors[index % companyColors.length],
          borderColor: companyColors[index % companyColors.length].replace('0.8', '1'),
          borderWidth: 2,
          borderRadius: 6
        };
      });

      this.contribChart.set({
        type: 'bar',
        data: {
          labels: dimensions,
          datasets
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'top' as const,
              labels: {
                color: theme.textColor,
                font: { size: 12, weight: '600' },
                usePointStyle: true,
                padding: 15
              }
            },
            title: {
              display: true,
              text: '📊 Factores de Contribución al Score por Empresa',
              font: { size: 16, weight: '700' },
              color: theme.textColor,
              padding: { bottom: 20 }
            },
            tooltip: {
              backgroundColor: theme.tooltipBg,
              titleColor: theme.textColor,
              bodyColor: theme.textColor,
              borderColor: theme.borderColor,
              borderWidth: 1,
              cornerRadius: 10,
              padding: 10
            }
          },
          scales: {
            x: {
              grid: { display: false },
              ticks: { 
                color: theme.textColor,
                font: { size: 10, weight: '500' },
                maxRotation: 45
              }
            },
            y: {
              grid: { 
                color: theme.gridColor,
                lineWidth: 1
              },
              ticks: { 
                color: theme.textColor,
                font: { size: 11 }
              },
              title: {
                display: true,
                text: 'Valor de Contribución',
                color: theme.textColor,
                font: { size: 12, weight: '600' }
              }
            }
          }
        }
      });
    } catch (error) {
      console.error('Error preparing contributions chart:', error);
    }
  }

  private prepareScenariosChart(d: SessionCompaniesAnalysis) {
    try {
      const companies = d?.companies || [];
      if (!companies.length) return;

      const theme = this.getThemeColors();
      const companyColors = this.getCompanyColors();

      const labels = companies.map((c, index) => 
        c?.dashboard?.company?.legal_name ||
        c?.dashboard?.company?.name ||
        c?.tax_id ||
        `Empresa ${index + 1}`
      );

      const currentScores: number[] = [];
      const scenario1Scores: number[] = [];
      const scenario2Scores: number[] = [];

      companies.forEach((c) => {
        const current = c?.dashboard?.score?.score;
        const processedCurrent = current != null ? Number(current) : 0;
        const finalCurrent = processedCurrent <= 1 ? processedCurrent * 100 : processedCurrent;
        currentScores.push(finalCurrent);
        
        const scenarios = c?.dashboard?.scenarios || [];
        const sc1 = scenarios[0]?.score;
        const sc2 = scenarios[1]?.score;
        
        // Simplify nested ternary operations
        const score1 = sc1 != null ? Number(sc1) : 0;
        const processedScore1 = score1 <= 1 ? score1 * 100 : score1;
        scenario1Scores.push(processedScore1);
        
        const score2 = sc2 != null ? Number(sc2) : 0;
        const processedScore2 = score2 <= 1 ? score2 * 100 : score2;
        scenario2Scores.push(processedScore2);
      });

      this.scenariosChart.set({
        type: 'bar',
        data: {
          labels,
          datasets: [
            {
              label: '📊 Score Actual',
              data: currentScores,
              backgroundColor: companyColors[0],
              borderColor: companyColors[0].replace('0.8', '1'),
              borderWidth: 2,
              borderRadius: 6
            },
            {
              label: '🎯 Escenario Optimista',
              data: scenario1Scores,
              backgroundColor: companyColors[2], // Green
              borderColor: companyColors[2].replace('0.8', '1'),
              borderWidth: 2,
              borderRadius: 6
            },
            {
              label: '⚡ Escenario Proyectado',
              data: scenario2Scores,
              backgroundColor: companyColors[3], // Amber
              borderColor: companyColors[3].replace('0.8', '1'),
              borderWidth: 2,
              borderRadius: 6
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'top' as const,
              labels: {
                color: theme.textColor,
                font: { size: 12, weight: '600' },
                usePointStyle: true,
                padding: 15
              }
            },
            title: {
              display: true,
              text: '🎯 Análisis de Escenarios de Mejora',
              font: { size: 16, weight: '700' },
              color: theme.textColor,
              padding: { bottom: 20 }
            },
            tooltip: {
              backgroundColor: theme.tooltipBg,
              titleColor: theme.textColor,
              bodyColor: theme.textColor,
              borderColor: theme.borderColor,
              borderWidth: 1,
              cornerRadius: 10,
              padding: 10,
              callbacks: {
                label: (ctx: any) => {
                  return `${ctx.dataset.label}: ${ctx.parsed.y.toFixed(1)}%`;
                }
              }
            }
          },
          scales: {
            x: {
              grid: { display: false },
              ticks: { 
                color: theme.textColor,
                font: { size: 11, weight: '500' },
                maxRotation: 45
              }
            },
            y: {
              grid: { 
                color: theme.gridColor,
                lineWidth: 1
              },
              ticks: { 
                color: theme.textColor,
                font: { size: 11 },
                callback: function(value: any) {
                  return `${value}%`;
                }
              },
              title: {
                display: true,
                text: 'Score (%)',
                color: theme.textColor,
                font: { size: 12, weight: '600' }
              }
            }
          }
        }
      });
    } catch (error) {
      console.error('Error preparing scenarios chart:', error);
    }
  }

  private prepareRiskAnalysisChart(d: SessionCompaniesAnalysis) {
    try {
      const companies = d?.companies || [];
      if (!companies.length) return;

      const theme = this.getThemeColors();
      
      const riskCounts = { 'Bajo': 0, 'Medio': 0, 'Alto': 0, 'Sin clasificar': 0 };
      companies.forEach(c => {
        const riskClass = c?.dashboard?.score?.risk_class || 'Sin clasificar';
        if (riskClass.includes('Bajo')) riskCounts['Bajo']++;
        else if (riskClass.includes('Medio')) riskCounts['Medio']++;
        else if (riskClass.includes('Alto')) riskCounts['Alto']++;
        else riskCounts['Sin clasificar']++;
      });

      const isDark = this.themeService.isDark();
      const riskColors = [
        isDark ? 'rgba(74, 222, 128, 0.8)' : 'rgba(34, 197, 94, 0.8)',  // Bajo - Green
        isDark ? 'rgba(250, 204, 21, 0.8)' : 'rgba(234, 179, 8, 0.8)',  // Medio - Yellow
        isDark ? 'rgba(248, 113, 113, 0.8)' : 'rgba(239, 68, 68, 0.8)', // Alto - Red
        isDark ? 'rgba(100, 116, 139, 0.8)' : 'rgba(148, 163, 184, 0.8)' // Sin clasificar - Gray
      ];

      this.riskChart.set({
        type: 'doughnut',
        data: {
          labels: ['🟢 Riesgo Bajo', '🟡 Riesgo Medio', '🔴 Riesgo Alto', '⚪ Sin Clasificar'],
          datasets: [{
            data: Object.values(riskCounts),
            backgroundColor: riskColors,
            borderColor: riskColors.map(color => color.replace('0.8', '1')),
            borderWidth: 3,
            hoverBorderWidth: 4,
            hoverOffset: 8
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: '60%',
          plugins: {
            legend: {
              position: 'bottom' as const,
              labels: {
                color: theme.textColor,
                font: { size: 12, weight: '600' },
                usePointStyle: true,
                padding: 20,
                generateLabels: (chart: any) => {
                  const data = chart.data;
                  return data.labels.map((label: string, i: number) => ({
                    text: `${label} (${data.datasets[0].data[i]})`,
                    fillStyle: data.datasets[0].backgroundColor[i],
                    hidden: false,
                    index: i
                  }));
                }
              }
            },
            title: {
              display: true,
              text: '⚠️ Distribución por Nivel de Riesgo',
              font: { size: 16, weight: '700' },
              color: theme.textColor,
              padding: { bottom: 20 }
            },
            tooltip: {
              backgroundColor: theme.tooltipBg,
              titleColor: theme.textColor,
              bodyColor: theme.textColor,
              borderColor: theme.borderColor,
              borderWidth: 1,
              cornerRadius: 10,
              padding: 12,
              callbacks: {
                label: (ctx: any) => {
                  const total = ctx.dataset.data.reduce((a: number, b: number) => a + b, 0);
                  const percentage = ((ctx.parsed / total) * 100).toFixed(1);
                  return `${ctx.label}: ${ctx.parsed} empresas (${percentage}%)`;
                }
              }
            }
          }
        }
      });
    } catch (error) {
      console.error('Error preparing risk analysis chart:', error);
    }
  }

  private prepareSectorChart(d: SessionCompaniesAnalysis) {
    try {
      const companies = d?.companies || [];
      if (!companies.length) return;

      const theme = this.getThemeColors();
      const companyColors = this.getCompanyColors();

      // Crear datos para gráfico radar basado en contribuciones
      const allDimensions = new Set<string>();
      companies.forEach(company => {
        const contributions = company?.dashboard?.contributions || [];
        contributions.forEach((contrib: any) => {
          const dimension = contrib?.dimension || contrib?.name || contrib?.key;
          if (dimension) allDimensions.add(dimension);
        });
      });

      if (!allDimensions.size) return;

      const dimensions = Array.from(allDimensions).slice(0, 8); // Limitar a 8 dimensiones

      const datasets = companies.slice(0, 5).map((company, index) => {
        const companyName = company?.dashboard?.company?.legal_name ||
                           company?.dashboard?.company?.name ||
                           company?.tax_id ||
                           `Empresa ${index + 1}`;
        
        const contributions = company?.dashboard?.contributions || [];
        const data = dimensions.map(dim => {
          const contrib = contributions.find((c: any) => 
            (c?.dimension || c?.name || c?.key) === dim
          );
          const value = contrib?.value || contrib?.score || contrib?.percentage || 0;
          return typeof value === 'number' ? Math.abs(value) : Math.abs(parseFloat(String(value))) || 0;
        });

        return {
          label: companyName,
          data,
          backgroundColor: companyColors[index % companyColors.length].replace('0.8', '0.2'),
          borderColor: companyColors[index % companyColors.length],
          borderWidth: 3,
          pointBackgroundColor: companyColors[index % companyColors.length],
          pointBorderColor: theme.backgroundColor,
          pointBorderWidth: 2,
          pointRadius: 5,
          pointHoverRadius: 7
        };
      });

      this.sectorChart.set({
        type: 'radar',
        data: {
          labels: dimensions,
          datasets
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'top' as const,
              labels: {
                color: theme.textColor,
                font: { size: 12, weight: '600' },
                usePointStyle: true,
                padding: 15
              }
            },
            title: {
              display: true,
              text: '🎯 Análisis Multidimensional por Sectores',
              font: { size: 16, weight: '700' },
              color: theme.textColor,
              padding: { bottom: 20 }
            },
            tooltip: {
              backgroundColor: theme.tooltipBg,
              titleColor: theme.textColor,
              bodyColor: theme.textColor,
              borderColor: theme.borderColor,
              borderWidth: 1,
              cornerRadius: 10,
              padding: 10
            }
          },
          scales: {
            r: {
              beginAtZero: true,
              grid: {
                color: theme.gridColor
              },
              angleLines: {
                color: theme.gridColor
              },
              pointLabels: {
                color: theme.textColor,
                font: { size: 10, weight: '500' }
              },
              ticks: {
                color: theme.textColor,
                font: { size: 9 },
                backdropColor: 'transparent'
              }
            }
          }
        }
      });
    } catch (error) {
      console.error('Error preparing sector chart:', error);
    }
  }
}
