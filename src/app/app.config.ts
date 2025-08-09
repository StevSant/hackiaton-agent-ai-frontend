import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection,
} from '@angular/core';
import { provideRouter, withViewTransitions } from '@angular/router';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';

import { routes } from './app.routes';
import {
  provideClientHydration,
  withEventReplay,
} from '@angular/platform-browser';
import { provideMarkdown } from 'ngx-markdown';
import { CHAT_STREAM_PORT, SESSIONS_PORT, AUTH_PORT, APP_INFO_PORT } from '@core/tokens';
import { SseService } from '@infrastructure/services/sse-service';
import { SessionsService } from '@infrastructure/services/sessions.service';
import { AuthService } from '@infrastructure/services/auth.service';
import { authInterceptorFn } from '@infrastructure/interceptors/auth.interceptor';
import { AppInfoService } from '@infrastructure/services/app-info.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideMarkdown(),
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
  provideRouter(routes, withViewTransitions()),
    provideClientHydration(withEventReplay()),
  provideHttpClient(withFetch(), withInterceptors([ authInterceptorFn ])),
  { provide: CHAT_STREAM_PORT, useExisting: SseService },
  { provide: SESSIONS_PORT, useExisting: SessionsService },
  { provide: AUTH_PORT, useExisting: AuthService },
  { provide: APP_INFO_PORT, useExisting: AppInfoService },
  ],
};
