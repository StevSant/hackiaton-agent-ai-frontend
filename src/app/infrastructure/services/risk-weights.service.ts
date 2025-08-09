import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '@environments/environment';
import { firstValueFrom } from 'rxjs';

export interface RiskWeightsConfig {
  id: string;
  version: number;
  weights: Record<string, number>;
}

@Injectable({ providedIn: 'root' })
export class RiskWeightsService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.baseUrl;

  async getActive(): Promise<RiskWeightsConfig | { message: string; weights: null }> {
    const url = `${this.base}/risk/weights/active`;
    return firstValueFrom(this.http.get<any>(url));
  }

  async upsert(version: number, weights: Record<string, number>): Promise<{ status: string; weights: RiskWeightsConfig }> {
    const url = `${this.base}/risk/weights/upsert`;
    return firstValueFrom(this.http.post<{ status: string; weights: RiskWeightsConfig }>(url, { version, weights }));
  }
}
