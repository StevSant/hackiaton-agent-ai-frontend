export interface TimeSeriesPoint {
  date: string;
  count: number;
}
export interface AdminStatsDTO {
  totals: Record<string, number>;
  files_breakdown: Record<string, number>;
  timeseries: Record<string, TimeSeriesPoint[]>;
}

export interface AdminCompanyDashboardDTO {
  // Minimal identity
  tax_id: string;
  name?: string | null;
  sector?: string | null;

  // New enriched payload from backend
  company?: {
    tax_id?: string;
    business_name?: string;
    legal_status?: string;
    ciiu?: string;
    company_type?: string;
    incorporation_date?: string; // ISO or YYYY-MM-DD
    address?: string;
    representatives?: any[];
    representative?: string;
    source_url?: string;
    additional?: {
      is_state_supplier?: boolean;
      offers_remittances?: boolean;
      sells_on_credit?: boolean;
      belongs_to_mv?: boolean;
      is_public_interest?: boolean;
      is_bic?: boolean;
      bic_since_year?: number | null;
      bic_impact_areas?: string[] | null;
      judicial_disposition?: string | null;
      last_corp_update_at?: string | null;
      is_foreign_domiciled?: boolean;
    };
    fetched_at?: string;
  } | null;
  score?: number | null;
  score_source?: string | null;
  financials?: any[];
  contributions?: any[];
  sector_comparison?: any;
  missing_data?: string[];
  imputation?: { error?: string; missing?: string[] } | null;
  scenarios?: any[];

  // Existing fields
  llm_insights?: any; // can vary
  metrics?: Record<string, number>;
  signals?: Array<{ key: string; value: string | number }>;
  overview?: string | null;
}

export abstract class AdminStatsPort {
  abstract getOverview(days?: number): Promise<AdminStatsDTO>;
  abstract getCompanyDashboard(
    taxId: string,
  ): Promise<AdminCompanyDashboardDTO>;
}
