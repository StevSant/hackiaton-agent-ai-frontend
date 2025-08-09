import { inject, Injectable } from '@angular/core';
import type { AppInfo } from '../models/app-info';
import type { AppInfoPort } from '../ports/app-info.port';
import { APP_INFO_PORT } from '../tokens';

@Injectable({ providedIn: 'root' })
export class GetAppInfoUseCase {
  private appInfo = inject<AppInfoPort>(APP_INFO_PORT);

  execute(): Promise<AppInfo> {
    return this.appInfo.getAppInfo();
  }
}
