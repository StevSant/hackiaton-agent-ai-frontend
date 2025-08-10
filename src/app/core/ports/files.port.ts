import type { Paginated } from '@core/models/paginated';

export interface UploadedFileMeta {
  id: string;
  url: string;
  filename: string;
  content_type: string;
  type_file: 'image' | 'pdf' | 'document';
  converted?: boolean;
  original_extension?: string | null;
  source_extension?: string | null;
  extracted_available?: boolean;
  owner_id?: string | null;
  session_id?: string | null;
}

export interface ListFilesResponse {
  total: number;
  items: UploadedFileMeta[];
}

export interface FilesPort {
  upload(file: File, subfolder?: string, sessionId?: string): Promise<UploadedFileMeta>;
  getFile(fileId: string): Promise<UploadedFileMeta>;
  list(params?: { type_file?: 'image' | 'pdf' | 'document'; subfolder?: string; page?: number; limit?: number; offset?: number }): Promise<Paginated<UploadedFileMeta>>;
  listBySession(sessionId: string): Promise<UploadedFileMeta[]>;
}
