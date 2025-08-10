import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '@environments/environment';
import type { AppInfo } from '@core/models/app-info';
import type { AppInfoPort } from '@core/ports';

@Injectable({ providedIn: 'root' })
export class AppInfoService implements AppInfoPort {
  private readonly base = environment.baseUrl;

  constructor(private readonly http: HttpClient) {}

  async getAppInfo(): Promise<AppInfo> {
  const url = `${this.base}/app-info/`;
    return firstValueFrom(
      this.http.get<AppInfo>(url).pipe(
        catchError(() =>
          of({
            site_name: 'Agente IA',
            site_icon: '/favicon.ico',
            site_logo: '/favicon.ico',
          } satisfies AppInfo)
        )
      )
    );
  }

  async updateAppInfo(payload: Partial<AppInfo>): Promise<AppInfo> {
  const url = `${this.base}/app-info/`;
    return firstValueFrom(this.http.put<AppInfo>(url, payload));
  }
}
