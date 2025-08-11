import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '@environments/environment';
import type { KpisPort } from '@core/ports';
import type { Kpis } from '@core/models';

@Injectable({ providedIn: 'root' })
export class KpisApiService implements KpisPort {
  private readonly base = environment.baseUrl;

  constructor(private readonly http: HttpClient) {}

  async getKpis(): Promise<Kpis> {
    // Endpoint hipotético: /metrics/kpis
    const url = `${this.base}/metrics/kpis`;
    const data = await firstValueFrom(this.http.get<Omit<Kpis, 'source'>>(url));
    return { ...data, source: 'api' } as Kpis;
  }
}
