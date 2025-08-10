export interface AdminMessageItem { id: string; role: 'user'|'agent'; content: string; created_at: string; file_ids: string[]; }
export interface AdminSessionItem { session_id: string; title: string; updated_at: string; }

export interface AdminMessagesPort {
  listSessions(): Promise<AdminSessionItem[]>;
  listMessages(sessionId: string): Promise<AdminMessageItem[]>;
}
