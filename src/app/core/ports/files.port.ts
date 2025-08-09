import type { Observable } from 'rxjs';

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
}

export interface ListFilesResponse {
  total: number;
  items: UploadedFileMeta[];
}

export interface FilesPort {
  upload(file: File, subfolder?: string): Promise<UploadedFileMeta>;
  getFile(fileId: string): Promise<UploadedFileMeta>;
  list(params?: { type_file?: 'image' | 'pdf' | 'document'; subfolder?: string; limit?: number; offset?: number }): Promise<ListFilesResponse>;
}
