import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection,
} from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withFetch } from '@angular/common/http';

import { routes } from './app.routes';
import {
  provideClientHydration,
  withEventReplay,
} from '@angular/platform-browser';
import { provideMarkdown } from 'ngx-markdown';
import { CHAT_STREAM_PORT, SESSIONS_PORT } from '@core/tokens';
import { SseService } from '@infrastructure/services/sse-service';
import { SessionsService } from '@infrastructure/services/sessions.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideMarkdown(),
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    provideRouter(routes),
    provideClientHydration(withEventReplay()),
  provideHttpClient(withFetch()),
  { provide: CHAT_STREAM_PORT, useExisting: SseService },
  { provide: SESSIONS_PORT, useExisting: SessionsService },
  ],
};
