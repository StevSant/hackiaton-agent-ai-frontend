import type { Paginated } from './paginated';

export interface PaginatedApi<T> {
  info?: {
    count: number;
    pages?: number;
    page_number?: number;
    next?: string | null;
    prev?: string | null;
  };
  results?: T[];
}

export function mapToPaginated<T>(
  data: any,
  params?: { page?: number; limit?: number },
): Paginated<T> {
  if (Array.isArray(data)) {
    const items = data as T[];
    const limit = params?.limit ?? items?.length ?? 0;
    const page = params?.page ?? 1;
    return { items, page, limit, total: items?.length ?? 0 };
  }
  const api = data as PaginatedApi<T>;
  if (api && Array.isArray(api.results) && api.info) {
    return {
      items: api.results ?? [],
      page: api.info?.page_number ?? params?.page ?? 1,
      limit: params?.limit ?? api.results?.length ?? 0,
      total: api.info?.count ?? api.results?.length ?? 0,
    };
  }
  // Fallback for { total, items, offset }
  if (typeof data?.total === 'number' && Array.isArray(data?.items)) {
    const limit = params?.limit ?? data.items?.length ?? 0;
    const total: number = data.total;
    const page =
      params?.page ?? (limit ? Math.floor((data.offset ?? 0) / limit) + 1 : 1);
    return { items: data.items as T[], page, limit, total };
  }
  // Ultimate fallback: empty page
  return {
    items: [],
    page: params?.page ?? 1,
    limit: params?.limit ?? 0,
    total: 0,
  };
}
