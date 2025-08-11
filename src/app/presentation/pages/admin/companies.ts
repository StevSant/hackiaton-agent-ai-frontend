import { Component, ChangeDetectionStrategy, computed, effect, inject, signal, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
// Using facade types; no direct item type import needed here
import { AdminCompaniesFacade } from '@app/application/admin/admin-companies.facade';
import { AdminStatsFacade } from '@app/application/admin/admin-stats.facade';
import { ActivatedRoute, Router } from '@angular/router';
import Chart from 'chart.js/auto';

@Component({
  selector: 'app-admin-companies',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslateModule],
  templateUrl: './companies.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminCompaniesPage {
  private readonly facade = inject(AdminCompaniesFacade);
  private readonly fb = inject(FormBuilder);
  private readonly stats = inject(AdminStatsFacade);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  items = this.facade.items;
  // UI-only filters derived from current items
  selectedSector = signal<string>('');
  sectors = computed(() => {
    const set = new Set<string>();
    for (const it of this.items() || []) { if (it.sector) set.add(it.sector); }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  });
  filteredItems = computed(() => {
    const sector = this.selectedSector();
    const arr = this.items() || [];
    if (!sector) return arr;
    return arr.filter(i => i.sector === sector);
  });
  page = this.facade.page;
  limit = this.facade.limit;
  total = this.facade.total;
  sortBy = this.facade.sortBy;
  sortOrder = this.facade.sortOrder;
  error = this.facade.error;
  loading = this.facade.loading;
  form = this.fb.group({ search: [''] });

  // Dashboard state
  readonly selectedTaxId = signal<string | null>(null);
  readonly company = this.stats.company;
  readonly companyLoading = this.stats.companyLoading;
  readonly companyError = this.stats.companyError;
  readonly isDashboardOpen = computed(() => !!this.selectedTaxId());
  readonly metricKeys = computed(() => {
    const m = this.company()?.metrics || null;
    return m ? Object.keys(m) : [];
  });

  @ViewChild('metricsChart', { static: false }) metricsChartRef?: ElementRef<HTMLCanvasElement>;
  private chart?: Chart;

  // React to modal open + metrics ready to render/destroy chart
  private readonly metricsEffect = effect(() => {
    const open = this.isDashboardOpen();
    const keys = this.metricKeys();
    if (open && keys.length) {
      // Defer to next macrotask to ensure view updated and canvas exists
      setTimeout(() => this.renderChart());
    } else {
      this.destroyChart();
    }
  });

  async ngOnInit() {
    await this.refresh();
    // Deep link: open dashboard when taxId query param is present
    const qTax = this.route.snapshot.queryParamMap.get('taxId');
    const pTax = this.route.snapshot.paramMap.get('taxId');
    const toOpen = pTax || qTax;
    if (toOpen) {
      this.openDashboard(toOpen);
    }
  }

  async refresh() { await this.facade.refresh(); }

  async applySearch() { await this.facade.applySearch(this.form.value.search?.trim() || ''); }

  async nextPage() { await this.facade.nextPage(); }

  async prevPage() { await this.facade.prevPage(); }

  setSort(field: 'tax_id'|'name'|'sector') { this.facade.setSort(field); }

  selectSector(sector: string) {
  const next = this.selectedSector() === sector ? '' : sector;
  this.selectedSector.set(next);
  this.facade.setSector(next);
  }

  async copyTaxId(taxId: string) {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(taxId);
      }
    } catch { /* noop */ }
  }

  async openDashboard(taxId: string) {
    if (!taxId) return;
    this.selectedTaxId.set(taxId);
    await this.stats.loadCompany(taxId);
    // update URL query param for deep link
    if (this.route.snapshot.routeConfig?.path?.includes('companies/:taxId')) {
      // Already on the parameterized route; just replace taxId
      void this.router.navigate(['../', taxId], { relativeTo: this.route, replaceUrl: true });
    } else {
      // Navigate to param route for a clean deep-link
      void this.router.navigate(['../companies', taxId], { relativeTo: this.route });
    }
  }

  closeDashboard() {
    this.selectedTaxId.set(null);
    // Clear current company data to avoid stale display next time
    this.stats.company.set(null);
    this.stats.companyError.set(null);
    this.destroyChart();
    // remove taxId from query params
    // If we're on /admin/companies/:taxId navigate back to /admin/companies
    if (this.route.snapshot.paramMap.get('taxId')) {
      void this.router.navigate(['../'], { relativeTo: this.route });
    } else {
      const qp = { ...this.route.snapshot.queryParams } as any;
      if (qp.taxId) { delete qp.taxId; }
      void this.router.navigate([], { relativeTo: this.route, queryParams: qp });
    }
  }

  copyText = async (text?: string | null) => {
    if (!text) return;
    try { await navigator.clipboard?.writeText(text); } catch { /* noop */ }
  };

  private renderChart() {
    const el = this.metricsChartRef?.nativeElement;
    const data = this.company()?.metrics || {};
    if (!el || !Object.keys(data).length) return;
    this.destroyChart();
    const labels = Object.keys(data);
    const values = labels.map(k => Number(data[k] as any) || 0);
    this.chart = new Chart(el, {
      type: 'bar',
      data: {
        labels,
        datasets: [{ label: 'Metrics', data: values, backgroundColor: 'rgba(59,130,246,0.4)', borderColor: 'rgba(59,130,246,1)', borderWidth: 1 }]
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false } },
        scales: { y: { beginAtZero: true } }
      }
    });
  }

  private destroyChart() {
    try { this.chart?.destroy(); } catch { /* noop */ } finally { this.chart = undefined; }
  }
}
