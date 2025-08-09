import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection,
  importProvidersFrom,
} from '@angular/core';
import { provideRouter, withViewTransitions } from '@angular/router';
import { provideHttpClient, withFetch, withInterceptors, HttpClient } from '@angular/common/http';

import { routes } from './app.routes';
import {
  provideClientHydration,
  withEventReplay,
} from '@angular/platform-browser';
import { provideMarkdown } from 'ngx-markdown';
import { CHAT_STREAM_PORT, SESSIONS_PORT, AUTH_PORT, APP_INFO_PORT, FILES_PORT, STT_PORT } from '@core/tokens';
import { SseService } from '@infrastructure/services/sse-service';
import { SessionsService } from '@infrastructure/services/sessions.service';
import { AuthService } from '@infrastructure/services/auth.service';
import { authInterceptorFn } from '@infrastructure/interceptors/auth.interceptor';
import { AppInfoService } from '@infrastructure/services/app-info.service';
import { FilesService } from '@infrastructure/services/files.service';
import { SttService } from '@infrastructure/services/stt.service';
import { TranslateLoader, TranslateModule, type TranslationObject } from '@ngx-translate/core';

class AppTranslateLoader implements TranslateLoader {
  constructor(private readonly http: HttpClient) {}
  getTranslation(lang: string) {
    return this.http.get<TranslationObject>(`/assets/i18n/${lang}.json`);
  }
}

export function HttpLoaderFactory(http: HttpClient) {
  return new AppTranslateLoader(http);
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideMarkdown(),
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
  // Skip the very first view transition to avoid bootstrap-time InvalidStateError
  provideRouter(routes, withViewTransitions({ skipInitialTransition: true })),
    provideClientHydration(withEventReplay()),
    provideHttpClient(withFetch(), withInterceptors([ authInterceptorFn ])),
    importProvidersFrom(
      TranslateModule.forRoot({
        loader: {
          provide: TranslateLoader,
          useFactory: HttpLoaderFactory,
          deps: [HttpClient],
        },
        fallbackLang: 'es',
      })
    ),
    { provide: CHAT_STREAM_PORT, useExisting: SseService },
    { provide: SESSIONS_PORT, useExisting: SessionsService },
    { provide: AUTH_PORT, useExisting: AuthService },
    { provide: APP_INFO_PORT, useExisting: AppInfoService },
  { provide: FILES_PORT, useExisting: FilesService },
  { provide: STT_PORT, useExisting: SttService },
  ],
};
