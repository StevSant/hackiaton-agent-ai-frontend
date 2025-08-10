export interface TimeSeriesPoint { date: string; count: number }
export interface AdminStatsDTO {
  totals: Record<string, number>;
  files_breakdown: Record<string, number>;
  timeseries: Record<string, TimeSeriesPoint[]>;
}

export abstract class AdminStatsPort {
  abstract getOverview(days?: number): Promise<AdminStatsDTO>;
}
