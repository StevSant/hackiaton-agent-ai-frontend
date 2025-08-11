import { ChangeDetectionStrategy, Component, inject, signal, PLATFORM_ID, computed, ViewChild, ElementRef, effect, OnInit, AfterViewInit, OnDestroy } from '@angular/core';
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
  imports: [CommonModule, RouterLink, TranslateModule, MatIconModule, ProfileMenuComponent],
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
  @ViewChild('speedCanvas') private readonly speedCanvas?: ElementRef<HTMLCanvasElement>;
  @ViewChild('approvalsCanvas') private readonly approvalsCanvas?: ElementRef<HTMLCanvasElement>;
  @ViewChild('totalTimeCanvas') private readonly totalTimeCanvas?: ElementRef<HTMLCanvasElement>;
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
    const labels = ['Captura', 'Normalización', 'Análisis', 'Validación', 'Reporte'];
    return {
      labels,
      datasets: [
        { label: 'Tradicional', data: [20, 30, 40, 25, 35], borderColor: '#94a3b8', backgroundColor: '#94a3b8', tension: 0.25, pointRadius: 2, fill: false },
        { label: 'Con IA', data: [8, 12, 15, 9, 10], borderColor: '#34d399', backgroundColor: '#34d399', tension: 0.25, pointRadius: 2, fill: false },
      ],
    };
  });

  approvalsChartData = computed<any>(() => ({
    labels: ['Aprobaciones', 'Observadas', 'Rechazos'],
    datasets: [{ data: [65, 20, 15], backgroundColor: ['#60a5fa', '#fbbf24', '#f87171'] }],
  }));

  totalTimeChartData = computed<any>(() => ({
    labels: ['Tradicional', 'Con IA'],
    datasets: [{ label: 'Tiempo total por solicitud (min)', data: [180, 75], backgroundColor: ['#94a3b8', '#34d399'] }],
  }));

  constructor() {
    // Seed with any cached role (client-only storage), SSR-safe
    const cached = this.token.getRole();
    if (cached) this.role.set(cached);
  }

  isAuth() { return this.token.isAuthenticated(); }
  isAdmin() { return this.role() === 'admin'; }

  ngOnInit(): void {
    // Fetch public app info for brand/description
    this.getInfo.execute().then(info => this.info.set(info)).catch(() => {});

    // If browser and authenticated, refresh role from API for accuracy
    if (this.isBrowser() && this.token.isAuthenticated()) {
      this.getProfileUC.execute(this.token.getToken()!)
        .then(p => { if (p?.role) { this.token.setRole(p.role); this.role.set(p.role); }})
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
    }, 150);
    // Recalculate on window resize
    this.resizeHandler = () => {
      requestAnimationFrame(() => {
        this.speedChart?.resize(); this.speedChart?.update();
        this.approvalsChart?.resize(); this.approvalsChart?.update();
        this.totalTimeChart?.resize(); this.totalTimeChart?.update();
      });
    };
    window.addEventListener('resize', this.resizeHandler);
    // Also on window load (post-hydration layout)
    window.addEventListener('load', this.resizeHandler);
  }
  }

  ngOnDestroy(): void {
    if (this.speedChart) { this.speedChart.destroy(); this.speedChart = undefined; }
    if (this.approvalsChart) { this.approvalsChart.destroy(); this.approvalsChart = undefined; }
    if (this.totalTimeChart) { this.totalTimeChart.destroy(); this.totalTimeChart = undefined; }
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
    const canvas = this.speedCanvas?.nativeElement; if (!canvas) return;
    const data = this.speedChartData();
    this.ensureChartLib().then(() => {
      if (!this.ChartCtor) return;
      const Ctor: any = this.ChartCtor;
      requestAnimationFrame(() => {
        const sized = this.prepareCanvas(canvas);
        if (!sized) { setTimeout(() => this.tick.update(v => v + 1), 200); return; }
        this.ensureResizeObserver(canvas, 'speed');
        if (!this.speedChart) { this.speedChart = new Ctor(canvas, { type: 'line', data, options: this.activityOptions });
          try { (window as any).__homeCharts = { ...(window as any).__homeCharts, speed: this.speedChart }; } catch {}
          try { console.debug('[Home] speed chart created'); } catch {}
        }
        else { this.speedChart.data = data; this.speedChart.update(); }
      });
    });
  });

  renderApprovalsEffect = effect(() => {
    void this.tick();
    if (!this.isBrowser() || !this.viewReady()) return;
    const canvas = this.approvalsCanvas?.nativeElement; if (!canvas) return;
    const data = this.approvalsChartData();
    this.ensureChartLib().then(() => {
      if (!this.ChartCtor) return;
      const Ctor: any = this.ChartCtor;
      requestAnimationFrame(() => {
        const sized = this.prepareCanvas(canvas);
        if (!sized) { setTimeout(() => this.tick.update(v => v + 1), 200); return; }
        this.ensureResizeObserver(canvas, 'approvals');
  if (!this.approvalsChart) { this.approvalsChart = new Ctor(canvas, { type: 'doughnut', data, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } } });
          try { (window as any).__homeCharts = { ...(window as any).__homeCharts, approvals: this.approvalsChart }; } catch {}
          try { console.debug('[Home] approvals chart created'); } catch {}
        }
        else { this.approvalsChart.data = data; this.approvalsChart.update(); }
      });
    });
  });

  renderTotalTimeEffect = effect(() => {
    void this.tick();
    if (!this.isBrowser() || !this.viewReady()) return;
    const canvas = this.totalTimeCanvas?.nativeElement; if (!canvas) return;
    const data = this.totalTimeChartData();
    this.ensureChartLib().then(() => {
      if (!this.ChartCtor) return;
      const Ctor: any = this.ChartCtor;
      requestAnimationFrame(() => {
        const sized = this.prepareCanvas(canvas);
        if (!sized) { setTimeout(() => this.tick.update(v => v + 1), 200); return; }
        this.ensureResizeObserver(canvas, 'total');
  if (!this.totalTimeChart) { this.totalTimeChart = new Ctor(canvas, { type: 'bar', data, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } } });
          try { (window as any).__homeCharts = { ...(window as any).__homeCharts, total: this.totalTimeChart }; } catch {}
          try { console.debug('[Home] total time chart created'); } catch {}
        }
        else { this.totalTimeChart.data = data; this.totalTimeChart.update(); }
      });
    });
  });

  activityOptions: any = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { position: 'bottom' } },
    scales: { x: { grid: { display: false } }, y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.08)' } } },
  };

  private async ensureChartLib(): Promise<void> {
    if (!this.isBrowser() || this.ChartCtor || this.chartLibLoading) return;
    this.chartLibLoading = true;
    try {
      const mod: any = await import('chart.js/auto');
      this.ChartCtor = mod.default ?? mod.Chart ?? mod;
    } finally {
      this.chartLibLoading = false;
    }
  }

  private prepareCanvas(canvas: HTMLCanvasElement): boolean {
    // Ensure non-zero size before creating the chart
    const parent = canvas.parentElement as HTMLElement | null;
    const rect = (parent ?? canvas).getBoundingClientRect();
    const w = Math.max(1, Math.floor(rect.width) || canvas.clientWidth || 800);
    const h = Math.max(1, Math.floor(rect.height) || canvas.clientHeight || 220);
    if (w <= 1 || h <= 1) return false;
    if (canvas.width !== w) canvas.width = w;
    if (canvas.height !== h) canvas.height = h;
    return true;
  }

  private ensureResizeObserver(canvas: HTMLCanvasElement, key: 'speed' | 'approvals' | 'total') {
    const parent = canvas.parentElement as HTMLElement | null;
    if (!parent) return;
    const ro = new ResizeObserver(() => {
      // Update canvas intrinsic size and resize chart
      const ok = this.prepareCanvas(canvas);
      if (!ok) return;
      if (key === 'speed' && this.speedChart) { this.speedChart.resize(); this.speedChart.update(); }
      if (key === 'approvals' && this.approvalsChart) { this.approvalsChart.resize(); this.approvalsChart.update(); }
      if (key === 'total' && this.totalTimeChart) { this.totalTimeChart.resize(); this.totalTimeChart.update(); }
    });
    ro.observe(parent);
    if (key === 'speed') this.speedRO = ro;
    if (key === 'approvals') this.approvalsRO = ro;
    if (key === 'total') this.totalTimeRO = ro;
  }
}
