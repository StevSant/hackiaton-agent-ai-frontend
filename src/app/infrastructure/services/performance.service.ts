import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class PerformanceService {
  init() {
    try {
      const isBrowser = typeof window !== 'undefined' && typeof document !== 'undefined';
      const isSmallScreen =
        isBrowser && window.matchMedia && window.matchMedia('(max-width: 480px)').matches;
      // Heuristic: low cores or very high DPR on small screens → enable lite mode
      const cores = (navigator as any).hardwareConcurrency ?? 4;
      const deviceMemory = (navigator as any).deviceMemory ?? 4;
      const dpr =
        typeof window !== 'undefined' ? (window.devicePixelRatio ?? 1) : 1;
      const isLowEnd = cores <= 4 || deviceMemory <= 4;
      const isiOS = /iP(ad|hone|od)/.test(navigator.userAgent);

      if (isBrowser) {
        if (isSmallScreen || (isLowEnd && dpr > 1) || isiOS) {
          document.body.classList.add('perf-lite');
        } else {
          document.body.classList.remove('perf-lite');
        }
      }
    } catch {}
  }
}
