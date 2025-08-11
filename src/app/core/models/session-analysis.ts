export interface CompanyDashboardSummary {
  company?: any;
  score?: {
    score?: number;
    risk_class?: string;
    recommended_credit_limit?: number;
  } | null;
  contributions?: any;
  scenarios?: any[];
  financials?: any[];
}

export interface CompanyInsights {
  narrative?: string;
  risk_summary?: string;
  reputation?: string;
  credit_recommendation?: string;
  key_factors?: string[];
  warnings?: string[];
  suggested_actions?: string[];
  opportunity_zones?: string[];
  early_alerts?: string[];
  data_quality_flags?: string[];
}

export interface SessionCompanyItem {
  tax_id: string;
  dashboard?: CompanyDashboardSummary | Record<string, any>;
  insights?: CompanyInsights | null;
  error?: string;
}

export interface AggregateInsights {
  overview?: string;
  ranking?: Array<{ tax_id: string; score?: number; risk_class?: string; position?: number }>;
  common_opportunities?: string[];
  common_risks?: string[];
  diversification_comment?: string;
  action_recommendations?: string[];
}

export interface SessionCompaniesAnalysis {
  session_id: string;
  company_count: number;
  companies: SessionCompanyItem[];
  aggregate_insights?: AggregateInsights | null;
}
