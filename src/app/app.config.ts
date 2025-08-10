import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection,
  importProvidersFrom,
  APP_INITIALIZER,
} from '@angular/core';
import { provideRouter, withViewTransitions } from '@angular/router';
import { provideHttpClient, withFetch, withInterceptors, HttpClient } from '@angular/common/http';

import { routes } from './app.routes';
import {
  provideClientHydration,
  withEventReplay,
} from '@angular/platform-browser';
import { provideMarkdown } from 'ngx-markdown';
import { CHAT_STREAM_PORT, SESSIONS_PORT, AUTH_PORT, APP_INFO_PORT, FILES_PORT, STT_PORT, ADMIN_USERS_PORT, COMPANIES_PORT, RISK_WEIGHTS_PORT, ADMIN_MESSAGES_PORT } from '@core/tokens';
import { SseService } from '@infrastructure/services/sse-service';
import { SessionsService } from '@infrastructure/services/sessions.service';
import { AuthService } from '@infrastructure/services/auth.service';
import { authInterceptorFn } from '@infrastructure/interceptors/auth.interceptor';
import { AppInfoService } from '@infrastructure/services/app-info.service';
import { FilesService } from '@infrastructure/services/files.service';
import { SttService } from '@infrastructure/services/stt.service';
import { TranslateLoader, TranslateModule, type TranslationObject } from '@ngx-translate/core';
import es from '../assets/i18n/es.json';
import en from '../assets/i18n/en.json';
import { of } from 'rxjs';
import { AdminUsersService } from '@infrastructure/services/admin-users.service';
import { CompaniesService } from '@infrastructure/services/companies.service';
import { RiskWeightsService } from '@infrastructure/services/risk-weights.service';
import { AdminMessagesService } from '@infrastructure/services/admin-messages.service';
import { LanguageService } from '@infrastructure/services/language.service';
import { TokenStorageService } from '@infrastructure/services/token-storage.service';
import { GetProfileUseCase } from '@core/use-cases';

class AppTranslateLoader implements TranslateLoader {
  // Inline translations to avoid runtime fetch
  getTranslation(lang: string) {
    const map: Record<string, TranslationObject> = { es: es as TranslationObject, en: en as TranslationObject };
    return of(map[lang] || map['es']);
  }
}

export function HttpLoaderFactory(_http: HttpClient) {
  // Keep signature for DI, but ignore HttpClient
  return new AppTranslateLoader();
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
    {
      provide: APP_INITIALIZER,
      multi: true,
      useFactory: (langService: LanguageService) => () => langService.initApp(),
      deps: [LanguageService],
    },
    {
      provide: APP_INITIALIZER,
      multi: true,
      useFactory: (token: TokenStorageService, getProfile: GetProfileUseCase) => async () => {
        // On app startup, refresh role if we have a token (client only). Safe on SSR: getToken() returns null.
        const t = token.getToken();
        if (!t) return;
        try {
          const profile = await getProfile.execute(t);
          if (profile?.role) token.setRole(profile.role);
        } catch {
          // ignore network/auth errors on bootstrap
        }
      },
      deps: [TokenStorageService, GetProfileUseCase],
    },
    { provide: CHAT_STREAM_PORT, useExisting: SseService },
    { provide: SESSIONS_PORT, useExisting: SessionsService },
    { provide: AUTH_PORT, useExisting: AuthService },
    { provide: APP_INFO_PORT, useExisting: AppInfoService },
  { provide: FILES_PORT, useExisting: FilesService },
  { provide: STT_PORT, useExisting: SttService },
  { provide: ADMIN_USERS_PORT, useExisting: AdminUsersService },
  { provide: COMPANIES_PORT, useExisting: CompaniesService },
  { provide: RISK_WEIGHTS_PORT, useExisting: RiskWeightsService },
  { provide: ADMIN_MESSAGES_PORT, useExisting: AdminMessagesService },
  ],
};
