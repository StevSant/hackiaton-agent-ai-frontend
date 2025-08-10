import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '@environments/environment';
import { firstValueFrom } from 'rxjs';
import { AdminStatsDTO, AdminStatsPort } from '@core/ports/admin-stats.port';

@Injectable({ providedIn: 'root' })
export class AdminStatsService implements AdminStatsPort {
  private readonly http = inject(HttpClient);
  private readonly base = environment.baseUrl;

  async getOverview(days = 30): Promise<AdminStatsDTO> {
    const url = `${this.base}/admin/stats/overview`;
    const data = await firstValueFrom(this.http.get<AdminStatsDTO>(url, { params: { days } }));
    return data;
  }
}
