import type { Paginated } from '@core/models/paginated';

export interface AdminUserItem {
  user_id: string;
  username: string;
  email: string;
  role: string;
  created_at?: string;
}

export interface CreateUserPayload {
  username: string;
  email: string;
  password: string;
  role?: 'admin' | 'user';
}

export interface AdminUsersPort {
  list(params?: {
    page?: number;
    limit?: number;
    email?: string;
    sort_by?: 'email' | 'username' | 'created_at';
    sort_order?: 'asc' | 'desc';
  }): Promise<Paginated<AdminUserItem>>;
  get(userId: string): Promise<AdminUserItem>;
  create(payload: CreateUserPayload): Promise<AdminUserItem>;
  update(
    userId: string,
    payload: Partial<CreateUserPayload>,
  ): Promise<AdminUserItem>;
  delete(userId: string): Promise<void>;
}
