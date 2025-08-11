import { Injectable } from '@angular/core';
import type { KpisPort } from '@core/ports';
import type { Kpis } from '@core/models';

@Injectable({ providedIn: 'root' })
export class KpisMockService implements KpisPort {
  async getKpis(): Promise<Kpis> {
    // Simula datos de demo
    return {
      speedMultiplier: 2.4,
      approvalDelta: 0.18,
      objectivityDelta: -0.35,
      totalTimeMinutes: 6,
      generatedAt: new Date().toISOString(),
      source: 'mock',
    };
  }
}
