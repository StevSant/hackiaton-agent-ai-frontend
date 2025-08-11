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
import { RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { MatIconModule } from '@angular/material/icon';
import { ProfileMenuComponent } from '@presentation/components/profile-menu/profile-menu';
import { LazyChartComponent } from '@presentation/components/lazy-chart/lazy-chart.component';
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
    LazyChartComponent,
  ],
  templateUrl: './home.html',
  styleUrls: ['./home.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomePage implements OnInit {
  private readonly token = inject(TokenStorageService);
  private readonly getProfileUC = inject(GetProfileUseCase);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly getInfo = inject(GetAppInfoUseCase);

  // Estado público consumido por la plantilla
  role = signal<string | null>(null);
  info = signal<AppInfo | null>(null);
  readonly isBrowser = computed(() => isPlatformBrowser(this.platformId));

  // === KPIs: datos fuera del template ===
  // En caso de necesitar cargarlos desde API, cámbialos por un use case o servicio y haz .set() al resolver.
  private readonly kpiSpeed = signal<number>(2.4); // multiplicador
  private readonly kpiApproval = signal<number>(0.18); // +18%
  private readonly kpiObjectivity = signal<number>(-0.35); // -35%
  private readonly kpiTimeMinutes = signal<number>(6); // ~6m

  // Displays formateados (separar presentación de dato)
  kpiSpeedDisplay = computed(() => `~${this.kpiSpeed().toFixed(1)}x`);
  kpiApprovalDisplay = computed(
    () =>
      `${this.kpiApproval() >= 0 ? '+' : ''}${Math.round(this.kpiApproval() * 100)}%`,
  );
  kpiObjectivityDisplay = computed(
    () =>
      `${this.kpiObjectivity() >= 0 ? '+' : ''}${Math.round(this.kpiObjectivity() * 100)}%`,
  );
  kpiTimeDisplay = computed(() => `~${this.kpiTimeMinutes()}m`);

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
    // Brand / info pública
    this.getInfo
      .execute()
      .then((info) => this.info.set(info))
      .catch(() => {});

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

    // Si a futuro los KPIs vienen de API:
    // someUseCase.execute().then(data => {
    //   this.kpiSpeed.set(data.speedMultiplier);
    //   this.kpiApproval.set(data.approvalDelta);
    //   this.kpiObjectivity.set(data.objectivityDelta);
    //   this.kpiTimeMinutes.set(data.totalMinutes);
    // });
  }

  get today() {
    return new Date();
  }
}
