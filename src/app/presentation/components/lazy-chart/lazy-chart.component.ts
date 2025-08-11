import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Input,
  OnDestroy,
  ViewChild,
  inject,
  PLATFORM_ID,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';

/**
 * LazyChartComponent
 * - Lazily loads Chart.js only in the browser when the canvas becomes visible.
 * - Provides a lightweight fallback drawing so layout is stable while loading.
 * - Handles resize and intersection observers; SSR safe (no direct window refs in ctor).
 */
@Component({
  selector: 'app-lazy-chart',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="chart-container" [style.minHeight.px]="height" [style.height.px]="height">
      <canvas #canvas [attr.aria-labelledby]="ariaLabelledby" role="img"></canvas>
    </div>
  `,
  styles: [
    `:host{display:block;}
     .chart-container{position:relative;width:100%;}
     canvas{display:block;width:100%!important;height:100%!important;}`,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LazyChartComponent implements AfterViewInit, OnDestroy {
  private readonly platformId = inject(PLATFORM_ID);
  readonly isBrowser = isPlatformBrowser(this.platformId);

  @Input({ required: true }) chartType!: string; // 'line' | 'bar' | 'doughnut' etc.
  @Input({ required: true }) data!: any;
  @Input() options: any;
  @Input() ariaLabelledby?: string;
  @Input() height = 220;

  @ViewChild('canvas') private canvasRef?: ElementRef<HTMLCanvasElement>;

  private chartInstance: any;
  private ChartCtor?: any;
  private loading = false;
  private ro?: ResizeObserver;
  private io?: IntersectionObserver;

  ngAfterViewInit(): void {
    if (!this.isBrowser) return;
    // Initial lightweight fallback
    const canvas = this.canvasRef?.nativeElement;
    if (canvas) this.drawFallback(canvas, this.chartType as any);
    this.observe();
  }

  private observe() {
    const canvas = this.canvasRef?.nativeElement;
    if (!canvas) return;
    if ('IntersectionObserver' in window) {
      this.io = new IntersectionObserver((entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            this.io?.disconnect();
            this.init();
            break;
          }
        }
      }, { threshold: 0.05 });
      this.io.observe(canvas);
    } else {
      // Fallback: init soon
      setTimeout(() => this.init(), 120);
    }
  }

  private async init() {
    if (!this.isBrowser || this.chartInstance) return;
    await this.ensureLib();
    const canvas = this.canvasRef?.nativeElement;
    if (!canvas) return;
    if (!this.ChartCtor) return; // Fallback already drawn
    this.prepareCanvas(canvas);
    try {
      this.chartInstance = new this.ChartCtor(canvas, {
        type: this.chartType,
        data: this.data,
        options: this.options || { responsive: true, maintainAspectRatio: false },
      });
    } catch {
      this.drawFallback(canvas, this.chartType as any);
    }
    this.setupResize(canvas);
  }

  private async ensureLib() {
    if (this.ChartCtor || this.loading) return;
    this.loading = true;
    try {
      const mod: any = await import('chart.js');
      const Chart = mod.Chart ?? mod.default;
      const registerables = mod.registerables ?? [];
      if (Chart && registerables.length) {
        try { Chart.register(...registerables); } catch {}
      }
      this.ChartCtor = Chart;
    } finally {
      this.loading = false;
    }
  }

  private setupResize(canvas: HTMLCanvasElement) {
    try {
      this.ro = new ResizeObserver(() => {
        if (!this.chartInstance) return;
        this.prepareCanvas(canvas);
        this.chartInstance.resize();
      });
      this.ro.observe(canvas.parentElement || canvas);
    } catch {}
  }

  private prepareCanvas(canvas: HTMLCanvasElement) {
    const parent = canvas.parentElement as HTMLElement | null;
    const rect = parent?.getBoundingClientRect();
    const w = Math.max(1, Math.floor(rect?.width || canvas.clientWidth || 800));
    const h = Math.max(1, Math.floor(rect?.height || canvas.clientHeight || this.height));
    if (canvas.width !== w) canvas.width = w;
    if (canvas.height !== h) canvas.height = h;
  }

  private drawFallback(canvas: HTMLCanvasElement, kind: 'line' | 'doughnut' | 'bar') {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const w = (canvas.width = canvas.width || 800);
    const h = (canvas.height = canvas.height || this.height);
    ctx.clearRect(0, 0, w, h);
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
      const cx = w / 2, cy = h / 2, r = Math.min(w, h) / 3;
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

  ngOnDestroy(): void {
    if (this.chartInstance) {
      try { this.chartInstance.destroy(); } catch {}
      this.chartInstance = undefined;
    }
    if (this.ro) { try { this.ro.disconnect(); } catch {}; this.ro = undefined; }
    if (this.io) { try { this.io.disconnect(); } catch {}; this.io = undefined; }
  }
}
