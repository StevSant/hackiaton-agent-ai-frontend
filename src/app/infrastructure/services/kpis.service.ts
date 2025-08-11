import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '@environments/environment';
import { firstValueFrom } from 'rxjs';

export interface KpisResponseDTO {
  speed_multiplier?: number;
  approval_delta?: number;
  objectivity_delta?: number;
  avg_time_minutes?: number;
  [key: string]: any;
}

@Injectable({ providedIn: 'root' })
export class KpisService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.baseUrl;

  private cache: KpisResponseDTO | null = null;
  private loadingPromise: Promise<KpisResponseDTO> | null = null;

  async getKpis(): Promise<KpisResponseDTO> {
    if (this.cache) return this.cache;
    if (this.loadingPromise) return this.loadingPromise;

    const attempt = async (): Promise<KpisResponseDTO> => {
      const dedicatedUrl = `${this.base}/admin/stats/kpis`;
      try {
        const dedicated = await firstValueFrom(
          this.http.get<KpisResponseDTO>(dedicatedUrl),
        );
        this.cache = dedicated;
        return dedicated;
      } catch {
        // ignore and fallback
      }

      const overviewUrl = `${this.base}/admin/stats/overview`;
      try {
        const overview: any = await firstValueFrom(
          this.http.get<any>(overviewUrl, { params: { days: 30 } }),
        );
        const kpis: KpisResponseDTO = {};
        if (overview?.kpis && typeof overview.kpis === 'object') {
          Object.assign(kpis, overview.kpis);
        }
  kpis.speed_multiplier ??= 2.4;
  kpis.approval_delta ??= 0.18;
  kpis.objectivity_delta ??= -0.35;
  kpis.avg_time_minutes ??= 6;
        this.cache = kpis;
        return kpis;
      } catch (e) {
        // Fallback silencioso: devolvemos valores por defecto y registramos el error una sola vez
        if (!this.cache) {
          // eslint-disable-next-line no-console
          console.error('[KpisService] Error obteniendo overview, usando defaults', e);
        }
        const defaults: KpisResponseDTO = {
          speed_multiplier: 2.4,
          approval_delta: 0.18,
          objectivity_delta: -0.35,
          avg_time_minutes: 6,
        };
        this.cache = defaults;
        return defaults;
      }
    };

    this.loadingPromise = attempt().finally(() => (this.loadingPromise = null));
    return this.loadingPromise;
  }
}
