import { inject, Injectable } from '@angular/core';
import type { AppInfo } from '@core/models/app-info';
import type { AppInfoPort } from '@core/ports';
import { APP_INFO_PORT } from '@core/tokens';

@Injectable({ providedIn: 'root' })
export class UpdateAppInfoUseCase {
  private readonly appInfo = inject<AppInfoPort>(APP_INFO_PORT);
  execute(payload: Partial<AppInfo>): Promise<AppInfo> {
    return this.appInfo.updateAppInfo(payload);
  }
}
