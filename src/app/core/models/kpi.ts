export interface Kpis {
  speedMultiplier: number; // e.g. 2.4 -> "~2.4x"
  approvalDelta: number; // e.g. 0.18 -> +18%
  objectivityDelta: number; // e.g. -0.35 -> -35%
  totalTimeMinutes: number; // e.g. 75
  generatedAt: string; // ISO timestamp
  source: 'api' | 'mock';
}

export interface KpisSummaryDisplay {
  speedDisplay: string;
  approvalDisplay: string;
  objectivityDisplay: string;
  timeDisplay: string;
  source: 'api' | 'mock';
}
