import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
  PLATFORM_ID,
  computed,
  OnInit,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { MatIconModule } from '@angular/material/icon';
import { ProfileMenuComponent } from '@presentation/components/profile-menu/profile-menu';
import { LazyChartComponent } from '@presentation/components/lazy-chart/lazy-chart.component';
import { HeaderComponent } from '@presentation/components/header';
import { TokenStorageService } from '@infrastructure/services/token-storage.service';
import { BackgroundService } from '@infrastructure/services/background.service';
import { GetProfileUseCase, GetKpisUseCase } from '@core/use-cases';
import { GetAppInfoUseCase } from '@core/use-cases/get-app-info.usecase';
import type { AppInfo } from '@core/models/app-info';
import type { Kpis } from '@core/models/kpi';

@Component({
  selector: 'app-home-page',
  standalone: true,
  imports: [
    CommonModule,
    TranslateModule,
    MatIconModule,
    ProfileMenuComponent,
    LazyChartComponent,
    HeaderComponent,
  ],
  templateUrl: './home.html',
  styleUrls: ['./home.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomePage implements OnInit {
  open = false;
  private readonly token = inject(TokenStorageService);
  private readonly getProfileUC = inject(GetProfileUseCase);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly getInfo = inject(GetAppInfoUseCase);
  private readonly bg = inject(BackgroundService);

  // KPIs
  private readonly getKpis = inject(GetKpisUseCase);

  // Estado público consumido por la plantilla
  role = signal<string | null>(null);
  info = signal<AppInfo | null>(null);
  kpis = signal<Kpis | null>(null);
  kpisLoading = signal(true);
  readonly isBrowser = computed(() => isPlatformBrowser(this.platformId));

  // === KPIs: datos fuera del template ===

  kpiSpeedDisplay = computed(() => {
    const k = this.kpis();
    return k ? `~${k.speedMultiplier.toFixed(1)}x` : '';
  });
  kpiApprovalDisplay = computed(() => {
    const k = this.kpis();
    if (!k) return '';
    const v = k.approvalDelta;
    return `${v >= 0 ? '+' : ''}${Math.round(v * 100)}%`;
  });
  kpiObjectivityDisplay = computed(() => {
    const k = this.kpis();
    if (!k) return '';
    const v = k.objectivityDelta;
    return `${v >= 0 ? '+' : ''}${Math.round(v * 100)}%`;
  });
  kpiTimeDisplay = computed(() => {
    const k = this.kpis();
    return k ? `~${k.totalTimeMinutes}m` : '';
  });
  kpiSource = computed(() => this.kpis()?.source ?? null);

  // Gráficos (demo)
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

  chartOptions = computed<any>(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
        titleColor: '#f5f5f5',
        bodyColor: '#e5e5e5',
        borderColor: 'rgba(167, 139, 250, 0.3)',
        borderWidth: 1,
        cornerRadius: 8,
        displayColors: false,
        callbacks: {
          label: (context: any) => {
            return context.parsed.y + ' minutos';
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(255, 255, 255, 0.08)',
          drawBorder: false
        },
        ticks: {
          color: '#e5e5e5',
          font: {
            size: 12
          },
          callback: (value: any) => {
            return value + 'm';
          }
        }
      },
      x: {
        grid: {
          display: false
        },
        ticks: {
          color: '#e5e5e5',
          font: {
            size: 12
          }
        }
      }
    }
  }));

  constructor() {
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
    // Initialize background service
    this.bg.init();

    // Brand / info pública
    this.getInfo
      .execute()
      .then((info) => this.info.set(info))
      .catch(() => {});

    // KPIs: load async
    this.kpisLoading.set(true);
    this.getKpis
      .execute()
      .then((k) => this.kpis.set(k))
      .catch(() => this.kpis.set(null))
      .finally(() => this.kpisLoading.set(false));

    // Actualiza rol si hay sesión
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
  }

  get today() {
    return new Date();
  }

  teamMembers = [
    'Bryan Steven Menoscal Santana',
    'Leopoldo Miquel Muñiz Rivas',
    'Gonzalo Delgado',
  ];
}
