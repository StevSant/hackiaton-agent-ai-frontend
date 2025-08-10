import { inject, Injectable } from '@angular/core';
import type { RiskWeightsPort, RiskWeightsConfig } from '@core/ports';
import { RISK_WEIGHTS_PORT } from '@core/tokens';

@Injectable({ providedIn: 'root' })
export class GetActiveRiskWeightsUseCase {
  private readonly port = inject<RiskWeightsPort>(RISK_WEIGHTS_PORT);
  execute(): Promise<RiskWeightsConfig | { message: string; weights: null }> {
    return this.port.getActive();
  }
}
