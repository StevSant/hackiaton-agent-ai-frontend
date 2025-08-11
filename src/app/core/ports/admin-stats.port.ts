export interface TimeSeriesPoint { date: string; count: number }
export interface AdminStatsDTO {
  totals: Record<string, number>;
  files_breakdown: Record<string, number>;
  timeseries: Record<string, TimeSeriesPoint[]>;
}

export interface AdminCompanyDashboardDTO {
  tax_id: string;
  name?: string | null;
  sector?: string | null;
  llm_insights?: any; // backend guarantees key exists; type can vary
  metrics?: Record<string, number>;
  signals?: Array<{ key: string; value: string | number }>; // optional helper shape
  overview?: string | null;
}

export abstract class AdminStatsPort {
  abstract getOverview(days?: number): Promise<AdminStatsDTO>;
  abstract getCompanyDashboard(taxId: string): Promise<AdminCompanyDashboardDTO>;
}
