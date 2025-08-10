import { Component, ChangeDetectionStrategy, OnInit, inject, computed, ViewChild, ElementRef, effect, PLATFORM_ID, OnDestroy, signal } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { AdminStatsFacade } from '../../..//application/admin/admin-stats.facade';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, MatIconModule, TranslateModule],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminDashboardPage implements OnInit, OnDestroy {
  private readonly stats = inject(AdminStatsFacade);
  private readonly platformId = inject(PLATFORM_ID);

  loading = this.stats.loading;
  readonly days = signal(30);
  totals = computed<Record<string, number>>(() => this.stats.data()?.totals || {});
  filesBreakdown = computed<Record<string, number>>(
    () => this.stats.data()?.files_breakdown || {}
  );

  readonly isBrowser = computed(() => isPlatformBrowser(this.platformId));

  @ViewChild('activityCanvas') private readonly activityCanvas?: ElementRef<HTMLCanvasElement>;
  @ViewChild('filesCanvas') private readonly filesCanvas?: ElementRef<HTMLCanvasElement>;
  private activityChart?: any;
  private filesChart?: any;
  private ChartCtor?: any;
  private chartLibLoading = false;

  // Line chart: activity over time (users, sessions, messages, files)
  activityChartData = computed<any>(() => {
    const ts = this.stats.data()?.timeseries || {};
    const seriesKeys = ['users', 'sessions', 'messages', 'files'];
    // Build sorted unique date labels
    const labelSet = new Set<string>();
    for (const k of seriesKeys) {
      (ts[k] || []).forEach(p => labelSet.add(p.date));
    }
  const labels = Array.from(labelSet).sort((a, b) => a.localeCompare(b));
    const colorMap: Record<string, string> = {
      users: '#60a5fa',
      sessions: '#34d399',
      messages: '#fbbf24',
      files: '#f472b6',
    };
    const datasets = seriesKeys.map(k => ({
      label: k,
      data: labels.map(d => (ts[k]?.find(p => p.date === d)?.count ?? 0)),
      fill: false,
      borderColor: colorMap[k] || '#94a3b8',
      backgroundColor: colorMap[k] || '#94a3b8',
      tension: 0.25,
      pointRadius: 2,
    }));
    return { labels, datasets };
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

  // Doughnut chart: files by type
  filesByTypeData = computed<any>(() => {
    const fb = this.filesBreakdown();
    const labels = Object.keys(fb);
    const values = labels.map(k => fb[k]);
    const palette = ['#60a5fa', '#34d399', '#fbbf24', '#f472b6', '#a78bfa', '#fca5a5', '#4ade80'];
    return {
      labels,
      datasets: [
        {
          data: values,
          backgroundColor: labels.map((_, i) => palette[i % palette.length]),
        },
      ],
    };
  });

  constructor() {}

  ngOnDestroy(): void {
    if (this.activityChart) {
      this.activityChart.destroy();
      this.activityChart = undefined;
    }
    if (this.filesChart) {
      this.filesChart.destroy();
      this.filesChart = undefined;
    }
  }

  // Render/update charts reactively when data changes (browser only)
  renderActivityEffect = effect(() => {
    if (!this.isBrowser()) return;
    const data = this.activityChartData();
    const canvas = this.activityCanvas?.nativeElement;
    if (!canvas) return;
    this.ensureChartLib().then(() => {
      if (!this.ChartCtor) return;
      const Ctor: any = this.ChartCtor;
      if (!this.activityChart) {
        this.activityChart = new Ctor(canvas, { type: 'line', data, options: this.activityOptions });
      } else {
        this.activityChart.data = data;
        this.activityChart.update();
      }
    });
  });

  renderFilesEffect = effect(() => {
    if (!this.isBrowser()) return;
    const data = this.filesByTypeData();
    const canvas = this.filesCanvas?.nativeElement;
    if (!canvas) return;
    this.ensureChartLib().then(() => {
      if (!this.ChartCtor) return;
      const Ctor: any = this.ChartCtor;
      if (!this.filesChart) {
        this.filesChart = new Ctor(canvas, { type: 'doughnut', data, options: { plugins: { legend: { position: 'bottom' } } } });
      } else {
        this.filesChart.data = data;
        this.filesChart.update();
      }
    });
  });

  sections = [
    {
      title: 'ADMIN.DASHBOARD.USERS_TITLE',
      icon: 'group',
      route: '/admin/users',
      desc: 'ADMIN.DASHBOARD.USERS_DESC',
    },
    {
      title: 'ADMIN.DASHBOARD.FILES_TITLE',
      icon: 'folder',
      route: '/admin/files',
      desc: 'ADMIN.DASHBOARD.FILES_DESC',
    },
    {
      title: 'ADMIN.DASHBOARD.MESSAGES_TITLE',
      icon: 'chat',
      route: '/admin/messages',
      desc: 'ADMIN.DASHBOARD.MESSAGES_DESC',
    },
    {
      title: 'ADMIN.DASHBOARD.APP_INFO_TITLE',
      icon: 'info',
      route: '/admin/app-info',
      desc: 'ADMIN.DASHBOARD.APP_INFO_DESC',
    },
    {
      title: 'ADMIN.DASHBOARD.RISK_WEIGHTS_TITLE',
      icon: 'science',
      route: '/admin/risk-weights',
      desc: 'ADMIN.DASHBOARD.RISK_WEIGHTS_DESC',
    },
    {
      title: 'ADMIN.DASHBOARD.COMPANIES_TITLE',
      icon: 'business',
      route: '/admin/companies',
      desc: 'ADMIN.DASHBOARD.COMPANIES_DESC',
    },
  ];

  ngOnInit(): void {
  this.stats.load(this.days());
  }

  fileTypes(): string[] {
    const fb = this.filesBreakdown();
    return Object.keys(fb);
  }

  setDays(d: number): void {
    if (this.days() === d) return;
    this.days.set(d);
    this.stats.load(d);
  }

  private async ensureChartLib(): Promise<void> {
    if (!this.isBrowser() || this.ChartCtor || this.chartLibLoading) {
      return;
    }
    this.chartLibLoading = true;
    try {
      const mod: any = await import('chart.js/auto');
      this.ChartCtor = mod.default ?? mod.Chart ?? mod;
    } finally {
      this.chartLibLoading = false;
    }
  }
}
