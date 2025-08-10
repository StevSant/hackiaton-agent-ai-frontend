export interface CompanyItem {
  tax_id: string;
  name?: string;
  sector?: string;
}

export interface CompaniesPort {
  list(params?: { page?: number; limit?: number; search?: string; sort_by?: 'tax_id'|'name'|'sector'; sort_order?: 'asc'|'desc' }): Promise<CompanyItem[]>;
  getByRuc(ruc: string): Promise<CompanyItem>;
}
