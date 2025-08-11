import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
  PLATFORM_ID,
  computed,
  ViewChild,
  ElementRef,
  effect,
  OnInit,
  AfterViewInit,
  OnDestroy,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { MatIconModule } from '@angular/material/icon';
import { ProfileMenuComponent } from '@presentation/components/profile-menu/profile-menu';
import { TokenStorageService } from '@infrastructure/services/token-storage.service';
import { GetProfileUseCase } from '@core/use-cases';
import { GetAppInfoUseCase } from '@core/use-cases/get-app-info.usecase';
import type { AppInfo } from '@core/models/app-info';

@Component({
  selector: 'app-home-page',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    TranslateModule,
    MatIconModule,
    ProfileMenuComponent,
  ],
  templateUrl: './home.html',
  styleUrls: ['./home.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomePage implements OnInit, AfterViewInit, OnDestroy {
  private readonly token = inject(TokenStorageService);
  private readonly getProfileUC = inject(GetProfileUseCase);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly getInfo = inject(GetAppInfoUseCase);

  // Reactive role to allow SSR -> CSR update without errors
  role = signal<string | null>(null);
  info = signal<AppInfo | null>(null);

  // Charts: SSR-safe flags and refs
  readonly isBrowser = computed(() => isPlatformBrowser(this.platformId));
  private readonly viewReady = signal(false);
  @ViewChild('speedCanvas')
  private readonly speedCanvas?: ElementRef<HTMLCanvasElement>;
  @ViewChild('approvalsCanvas')
  private readonly approvalsCanvas?: ElementRef<HTMLCanvasElement>;
  @ViewChild('totalTimeCanvas')
  private readonly totalTimeCanvas?: ElementRef<HTMLCanvasElement>;
  private ChartCtor?: any;
  private chartLibLoading = false;
  private speedChart?: any;
  private approvalsChart?: any;
  private totalTimeChart?: any;
  private resizeHandler?: () => void;
  private tick = signal(0);
  private speedRO?: ResizeObserver;
  private approvalsRO?: ResizeObserver;
  private totalTimeRO?: ResizeObserver;

  // Marketing charts (static demo data)
  speedChartData = computed<any>(() => {
    const labels = [
      'Captura',
      'Normalización',
      'Análisis',
      'Validación',
      'Reporte',
    ];
    return {
      labels,
      datasets: [
        {
          label: 'Tradicional',
          data: [20, 30, 40, 25, 35],
          borderColor: '#a8b3c2',
          backgroundColor: 'rgba(148,163,184,0.18)',
          borderWidth: 3,
          tension: 0.25,
          pointRadius: 3,
          fill: false,
        },
        {
          label: 'Con IA',
          data: [8, 12, 15, 9, 10],
          borderColor: '#34d399',
          backgroundColor: 'rgba(52,211,153,0.18)',
          borderWidth: 3,
          tension: 0.25,
          pointRadius: 3,
          fill: false,
        },
      ],
    };
  });

  approvalsChartData = computed<any>(() => ({
    labels: ['Aprobaciones', 'Observadas', 'Rechazos'],
    datasets: [
      {
        data: [65, 20, 15],
        backgroundColor: ['#60a5fa', '#fbbf24', '#f87171'],
      },
    ],
  }));

  totalTimeChartData = computed<any>(() => ({
    labels: ['Tradicional', 'Con IA'],
    datasets: [
      {
        label: 'Tiempo total por solicitud (min)',
        data: [180, 75],
        backgroundColor: ['#94a3b8', '#34d399'],
      },
    ],
  }));

  constructor() {
    // Seed with any cached role (client-only storage), SSR-safe
    const cached = this.token.getRole();
    if (cached) this.role.set(cached);
  }

  isAuth() {
    return this.token.isAuthenticated();
  }
  isAdmin() {
    return this.role() === 'admin';
  }

  ngOnInit(): void {
    // Fetch public app info for brand/description
    this.getInfo
      .execute()
      .then((info) => this.info.set(info))
      .catch(() => {});

    // If browser and authenticated, refresh role from API for accuracy
    if (this.isBrowser() && this.token.isAuthenticated()) {
      this.getProfileUC
        .execute(this.token.getToken()!)
        .then((p) => {
          if (p?.role) {
            this.token.setRole(p.role);
            this.role.set(p.role);
          }
        })
        .catch(() => {});
    }

    // Charts are marketing-only here; no backend stats needed
  }

  ngAfterViewInit(): void {
    this.viewReady.set(true);
    // Preload Chart.js ASAP on the client
    this.ensureChartLib();
    // Fallback: re-render after a short delay to ensure containers have final size
    if (this.isBrowser()) {
      setTimeout(() => {
        this.speedChart?.update();
        this.approvalsChart?.update();
        this.totalTimeChart?.update();
        // Try to initialize charts imperatively too
        this.tryInitCharts(0);
      }, 150);
      // Recalculate on window resize
      this.resizeHandler = () => {
        requestAnimationFrame(() => {
          this.speedChart?.resize();
          this.speedChart?.update();
          this.approvalsChart?.resize();
          this.approvalsChart?.update();
          this.totalTimeChart?.resize();
          this.totalTimeChart?.update();
        });
      };
      window.addEventListener('resize', this.resizeHandler);
      // Also on window load (post-hydration layout)
      window.addEventListener('load', () => {
        this.resizeHandler?.();
        this.tryInitCharts(0);
      });
    }
  }

  ngOnDestroy(): void {
    if (this.speedChart) {
      this.speedChart.destroy();
      this.speedChart = undefined;
    }
    if (this.approvalsChart) {
      this.approvalsChart.destroy();
      this.approvalsChart = undefined;
    }
    if (this.totalTimeChart) {
      this.totalTimeChart.destroy();
      this.totalTimeChart = undefined;
    }
    if (this.isBrowser() && this.resizeHandler) {
      window.removeEventListener('resize', this.resizeHandler);
      window.removeEventListener('load', this.resizeHandler);
    }
  }

  // Reactive rendering (browser only)
  renderSpeedEffect = effect(() => {
    // subscribe to tick to allow retries
    void this.tick();
    if (!this.isBrowser() || !this.viewReady()) return;
    const canvas = this.speedCanvas?.nativeElement;
    if (!canvas) return;
    // quick fallback paint while waiting
    if (!this.speedChart) this.drawFallback(canvas, 'line');
    const data = this.speedChartData();
    this.ensureChartLib().then(() => {
      if (!this.ChartCtor) {
        this.drawFallback(canvas, 'line');
        return;
      }
      const Ctor: any = this.ChartCtor;
      requestAnimationFrame(() => {
        const sized = this.prepareCanvas(canvas);
        if (!sized) {
          setTimeout(() => this.tick.update((v) => v + 1), 200);
          return;
        }
        this.ensureResizeObserver(canvas, 'speed');
        if (!this.speedChart) {
          try {
            this.speedChart = new Ctor(canvas, {
              type: 'line',
              data,
              options: this.activityOptions,
            });
          } catch (err) {
            try {
              console.error('[Home] speed chart error', err);
            } catch {}
            this.drawFallback(canvas, 'line');
            return;
          }
          try {
            (window as any).__homeCharts = {
              ...(window as any).__homeCharts,
              speed: this.speedChart,
            };
          } catch {}
          try {
            console.debug('[Home] speed chart created');
          } catch {}
        } else {
          this.speedChart.data = data;
          this.speedChart.update();
        }
      });
    });
  });

  renderApprovalsEffect = effect(() => {
    void this.tick();
    if (!this.isBrowser() || !this.viewReady()) return;
    const canvas = this.approvalsCanvas?.nativeElement;
    if (!canvas) return;
    if (!this.approvalsChart) this.drawFallback(canvas, 'doughnut');
    const data = this.approvalsChartData();
    this.ensureChartLib().then(() => {
      if (!this.ChartCtor) {
        this.drawFallback(canvas, 'doughnut');
        return;
      }
      const Ctor: any = this.ChartCtor;
      requestAnimationFrame(() => {
        const sized = this.prepareCanvas(canvas);
        if (!sized) {
          setTimeout(() => this.tick.update((v) => v + 1), 200);
          return;
        }
        this.ensureResizeObserver(canvas, 'approvals');
        if (!this.approvalsChart) {
          try {
            this.approvalsChart = new Ctor(canvas, {
              type: 'doughnut',
              data,
              options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { position: 'bottom' } },
              },
            });
          } catch (err) {
            try {
              console.error('[Home] approvals chart error', err);
            } catch {}
            this.drawFallback(canvas, 'doughnut');
            return;
          }
          try {
            (window as any).__homeCharts = {
              ...(window as any).__homeCharts,
              approvals: this.approvalsChart,
            };
          } catch {}
          try {
            console.debug('[Home] approvals chart created');
          } catch {}
        } else {
          this.approvalsChart.data = data;
          this.approvalsChart.update();
        }
      });
    });
  });

  renderTotalTimeEffect = effect(() => {
    void this.tick();
    if (!this.isBrowser() || !this.viewReady()) return;
    const canvas = this.totalTimeCanvas?.nativeElement;
    if (!canvas) return;
    if (!this.totalTimeChart) this.drawFallback(canvas, 'bar');
    const data = this.totalTimeChartData();
    this.ensureChartLib().then(() => {
      if (!this.ChartCtor) {
        this.drawFallback(canvas, 'bar');
        return;
      }
      const Ctor: any = this.ChartCtor;
      requestAnimationFrame(() => {
        const sized = this.prepareCanvas(canvas);
        if (!sized) {
          setTimeout(() => this.tick.update((v) => v + 1), 200);
          return;
        }
        this.ensureResizeObserver(canvas, 'total');
        if (!this.totalTimeChart) {
          try {
            this.totalTimeChart = new Ctor(canvas, {
              type: 'bar',
              data,
              options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: { y: { beginAtZero: true } },
              },
            });
          } catch (err) {
            try {
              console.error('[Home] total chart error', err);
            } catch {}
            this.drawFallback(canvas, 'bar');
            return;
          }
          try {
            (window as any).__homeCharts = {
              ...(window as any).__homeCharts,
              total: this.totalTimeChart,
            };
          } catch {}
          try {
            console.debug('[Home] total time chart created');
          } catch {}
        } else {
          this.totalTimeChart.data = data;
          this.totalTimeChart.update();
        }
      });
    });
  });

  activityOptions: any = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { position: 'bottom' } },
    scales: {
      x: { grid: { display: false } },
      y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.08)' } },
    },
  };

  private async ensureChartLib(): Promise<void> {
    if (!this.isBrowser() || this.ChartCtor || this.chartLibLoading) return;
    this.chartLibLoading = true;
    try {
      // Use core build and register elements/controllers explicitly for reliability
      const mod: any = await import('chart.js');
      const Chart = mod.Chart ?? mod.default;
      const registerables = mod.registerables ?? [];
      if (Chart && Array.isArray(registerables) && registerables.length) {
        try {
          Chart.register(...registerables);
        } catch {}
      }
      this.ChartCtor = Chart ?? mod;
    } finally {
      this.chartLibLoading = false;
    }
  }

  private prepareCanvas(canvas: HTMLCanvasElement): boolean {
    // Ensure non-zero size before creating the chart
    const parent = canvas.parentElement as HTMLElement | null;
    const rect = (parent ?? canvas).getBoundingClientRect();
    const w = Math.max(1, Math.floor(rect.width) || canvas.clientWidth || 800);
    const h = Math.max(
      1,
      Math.floor(rect.height) || canvas.clientHeight || 220
    );
    if (w <= 1 || h <= 1) return false;
    if (canvas.width !== w) canvas.width = w;
    if (canvas.height !== h) canvas.height = h;
    return true;
  }

  private ensureResizeObserver(
    canvas: HTMLCanvasElement,
    key: 'speed' | 'approvals' | 'total'
  ) {
    const parent = canvas.parentElement as HTMLElement | null;
    if (!parent) return;
    const ro = new ResizeObserver(() => {
      // Update canvas intrinsic size and resize chart
      const ok = this.prepareCanvas(canvas);
      if (!ok) return;
      if (key === 'speed' && this.speedChart) {
        this.speedChart.resize();
        this.speedChart.update();
      }
      if (key === 'approvals' && this.approvalsChart) {
        this.approvalsChart.resize();
        this.approvalsChart.update();
      }
      if (key === 'total' && this.totalTimeChart) {
        this.totalTimeChart.resize();
        this.totalTimeChart.update();
      }
    });
    ro.observe(parent);
    if (key === 'speed') this.speedRO = ro;
    if (key === 'approvals') this.approvalsRO = ro;
    if (key === 'total') this.totalTimeRO = ro;
  }

  private tryInitCharts(attempt: number) {
    if (!this.isBrowser()) return;
    const MAX = 10;
    const backoff = Math.min(800, 100 + attempt * 100);
    const ChartCtor = this.ChartCtor;
    const canvases: Array<
      [HTMLCanvasElement | undefined, 'speed' | 'approvals' | 'total']
    > = [
      [this.speedCanvas?.nativeElement, 'speed'],
      [this.approvalsCanvas?.nativeElement, 'approvals'],
      [this.totalTimeCanvas?.nativeElement, 'total'],
    ];
    const pending = canvases.some(([c]) => !!c);
    if (!pending) return;
    if (!ChartCtor) {
      this.ensureChartLib().then(() =>
        setTimeout(() => this.tryInitCharts(attempt + 1), backoff)
      );
      return;
    }
    // Create each if not created yet
    canvases.forEach(([canvas, kind]) => {
      if (!canvas) return;
      const ok = this.prepareCanvas(canvas);
      if (!ok) {
        setTimeout(() => this.tryInitCharts(attempt + 1), backoff);
        return;
      }
      if (kind === 'speed' && !this.speedChart) {
        try {
          this.speedChart = new (ChartCtor as any)(canvas, {
            type: 'line',
            data: this.speedChartData(),
            options: this.activityOptions,
          });
        } catch {
          this.drawFallback(canvas, 'line');
        }
      }
      if (kind === 'approvals' && !this.approvalsChart) {
        try {
          this.approvalsChart = new (ChartCtor as any)(canvas, {
            type: 'doughnut',
            data: this.approvalsChartData(),
            options: {
              responsive: true,
              maintainAspectRatio: false,
              plugins: { legend: { position: 'bottom' } },
            },
          });
        } catch {
          this.drawFallback(canvas, 'doughnut');
        }
      }
      if (kind === 'total' && !this.totalTimeChart) {
        try {
          this.totalTimeChart = new (ChartCtor as any)(canvas, {
            type: 'bar',
            data: this.totalTimeChartData(),
            options: {
              responsive: true,
              maintainAspectRatio: false,
              plugins: { legend: { display: false } },
              scales: { y: { beginAtZero: true } },
            },
          });
        } catch {
          this.drawFallback(canvas, 'bar');
        }
      }
    });
    if (
      attempt < MAX &&
      (!this.speedChart || !this.approvalsChart || !this.totalTimeChart)
    ) {
      setTimeout(() => this.tryInitCharts(attempt + 1), backoff);
    }
  }

  private drawFallback(
    canvas: HTMLCanvasElement,
    kind: 'line' | 'doughnut' | 'bar'
  ) {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const w = canvas.width,
      h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    // subtle background
    ctx.fillStyle = 'rgba(255,255,255,0.02)';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#22d3ee';
    ctx.lineWidth = 3;
    if (kind === 'line') {
      ctx.beginPath();
      const pts = [0.1, 0.3, 0.6, 0.4, 0.8].map((x, i) => ({
        x: 40 + (i * (w - 80)) / 4,
        y: h - 40 - [30, 70, 100, 80, 120][i],
      }));
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
      ctx.stroke();
    } else if (kind === 'bar') {
      const bars = [0.6, 0.25];
      const bw = (w - 80) / (bars.length * 2);
      bars.forEach((v, i) => {
        const x = 40 + i * 2 * bw;
        const bh = (h - 80) * v;
        ctx.fillStyle = i === 0 ? '#94a3b8' : '#34d399';
        ctx.fillRect(x, h - 40 - bh, bw, bh);
      });
    } else if (kind === 'doughnut') {
      const cx = w / 2,
        cy = h / 2,
        r = Math.min(w, h) / 3;
      const parts = [0.65, 0.2, 0.15];
      const colors = ['#60a5fa', '#fbbf24', '#f87171'];
      let start = -Math.PI / 2;
      parts.forEach((p, i) => {
        const end = start + p * 2 * Math.PI;
        ctx.beginPath();
        ctx.arc(cx, cy, r, start, end);
        ctx.lineWidth = r * 0.5;
        ctx.strokeStyle = colors[i];
        ctx.stroke();
        start = end;
      });
    }
  }
}
