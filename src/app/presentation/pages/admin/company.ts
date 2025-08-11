import { Component, ChangeDetectionStrategy, computed, effect, inject, signal, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { ActivatedRoute, Router } from '@angular/router';
import Chart from 'chart.js/auto';
import { AdminStatsFacade } from '@app/application/admin/admin-stats.facade';

@Component({
  selector: 'app-admin-company',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './company.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminCompanyPage {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly stats = inject(AdminStatsFacade);

  readonly taxId = signal<string | null>(null);
  readonly company = this.stats.company;
  readonly companyLoading = this.stats.companyLoading;
  readonly companyError = this.stats.companyError;
  readonly metricKeys = computed(() => {
    const m = this.company()?.metrics || null;
    return m ? Object.keys(m) : [];
  });

  @ViewChild('metricsChart', { static: false }) metricsChartRef?: ElementRef<HTMLCanvasElement>;
  private chart?: Chart;

  private readonly metricsEffect = effect(() => {
    const keys = this.metricKeys();
    const loading = this.companyLoading();
    if (!loading && keys.length) {
      setTimeout(() => this.renderChart());
    } else {
      this.destroyChart();
    }
  });

  ngOnInit() {
    this.route.paramMap.subscribe(async (pm) => {
      const id = pm.get('taxId');
      this.taxId.set(id);
      if (id) await this.stats.loadCompany(id);
    });
  }

  back() { this.router.navigate(['/admin/companies']); }

  copyText = async (text?: string | null) => {
    if (!text) return;
    try { await navigator.clipboard?.writeText(text); } catch {}
  };

  private renderChart() {
    const el = this.metricsChartRef?.nativeElement;
    const data = this.company()?.metrics || {};
    if (!el || !Object.keys(data).length) return;
    this.destroyChart();
    const labels = Object.keys(data);
    const values = labels.map((k) => Number((data as any)[k]) || 0);
    this.chart = new Chart(el, {
      type: 'bar',
      data: {
        labels,
        datasets: [{ label: 'Metrics', data: values, backgroundColor: 'rgba(59,130,246,0.4)', borderColor: 'rgba(59,130,246,1)', borderWidth: 1 }]
      },
      options: { responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }
    });
  }

  private destroyChart() {
    try { this.chart?.destroy(); } catch {} finally { this.chart = undefined; }
  }
}
