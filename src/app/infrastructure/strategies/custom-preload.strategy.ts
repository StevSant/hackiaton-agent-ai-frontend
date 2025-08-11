import { Injectable, inject } from '@angular/core';
import { Route, PreloadingStrategy } from '@angular/router';
import { Observable, of } from 'rxjs';
import { PerformanceService } from '../services/performance.service';

@Injectable({ providedIn: 'root' })
export class CustomPreloadStrategy implements PreloadingStrategy {
  private readonly perf = inject(PerformanceService);

  // Simple heuristic: if body has perf-lite, avoid preloading admin/* and other heavy routes
  preload(route: Route, load: () => Observable<any>): Observable<any> {
    try {
      const isLite =
        typeof document !== 'undefined' &&
        document.body.classList.contains('perf-lite');
      const path = route.path ?? '';
      // Allow opt-in override with data: { preload: true|false }
      const flag = route.data?.['preload'];
      if (flag === true) return load();
      if (flag === false) return of(null);

      if (isLite) {
        // In lite mode: only preload critical simple routes; skip admin and others
        if (path === 'home' || path === 'chat' || path?.startsWith('chat/')) {
          return load();
        }
        return of(null);
      }
      // Desktop/full mode: preload everything
      return load();
    } catch {
      return load();
    }
  }
}
