import type { Paginated } from '@core/models/paginated';

export interface AdminMessageItem { id: string; role: 'user'|'agent'; content: string; created_at: string; file_ids: string[]; }
export interface AdminSessionItem { session_id: string; user_id: string; title: string; updated_at: string; }

export interface AdminMessagesPort {
  listSessions(params?: { page?: number; limit?: number; search?: string; sort_by?: 'updated_at'|'title'; sort_order?: 'asc'|'desc' }): Promise<Paginated<AdminSessionItem>>;
  listMessages(sessionId: string, params?: { page?: number; limit?: number }): Promise<Paginated<AdminMessageItem>>;
}
