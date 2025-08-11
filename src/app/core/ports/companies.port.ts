export interface CompanyItem {
  tax_id: string;
  name?: string;
  sector?: string;
}

export interface CompaniesPort {
  // sort_by 'name' will be mapped to backend 'business_name' by the service
  list(params?: {
    page?: number;
    limit?: number;
    search?: string;
    sector?: string;
    sort_by?: 'tax_id' | 'name' | 'sector';
    sort_order?: 'asc' | 'desc';
  }): Promise<import('../models/paginated').Paginated<CompanyItem>>;
  getByRuc(ruc: string): Promise<CompanyItem>;
}
