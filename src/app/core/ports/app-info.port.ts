import type { AppInfo } from '../models/app-info';

export interface AppInfoPort {
  getAppInfo(): Promise<AppInfo>;
  updateAppInfo(payload: Partial<AppInfo>): Promise<AppInfo>;
}
