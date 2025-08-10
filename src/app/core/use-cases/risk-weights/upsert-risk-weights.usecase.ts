import { inject, Injectable } from '@angular/core';
import type { RiskWeightsPort, RiskWeightsConfig } from '@core/ports';
import { RISK_WEIGHTS_PORT } from '@core/tokens';

@Injectable({ providedIn: 'root' })
export class UpsertRiskWeightsUseCase {
  private readonly port = inject<RiskWeightsPort>(RISK_WEIGHTS_PORT);
  execute(version: number, weights: Record<string, number>): Promise<{ status: string; weights: RiskWeightsConfig }> {
    return this.port.upsert(version, weights);
  }
}
