export interface RiskWeightsConfig {
  id: string;
  version: number;
  weights: Record<string, number>;
}

export interface RiskWeightsPort {
  getActive(): Promise<RiskWeightsConfig | { message: string; weights: null }>;
  upsert(version: number, weights: Record<string, number>): Promise<{ status: string; weights: RiskWeightsConfig }>;
}
