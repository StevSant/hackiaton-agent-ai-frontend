import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '@environments/environment';
import { firstValueFrom } from 'rxjs';
import type { Paginated } from '@core/models/paginated';
import { mapToPaginated } from '@core/models/pagination-api';

export interface UploadedFileMeta {
  id: string;
  url: string;
  filename: string;
  content_type: string;
  type_file: 'image' | 'pdf' | 'document';
  converted?: boolean;
  original_extension?: string | null;
  source_extension?: string | null; // backend may return this field name
  extracted_available?: boolean; // present when metadata extraction exists
  owner_id?: string | null;
  session_id?: string | null;
}

// Legacy shape kept for compatibility in mapping helper
export interface ListFilesResponse { total: number; items: UploadedFileMeta[]; offset?: number; }

@Injectable({ providedIn: 'root' })
export class FilesService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.baseUrl;

  async upload(file: File, subfolder = '', sessionId?: string): Promise<UploadedFileMeta> {
    const form = new FormData();
    form.append('upload', file);
    form.append('subfolder', subfolder);
    const url = `${this.base}/files/`;
    const params: any = {};
    if (sessionId) {
      params.session_id = sessionId;
      // Also include in form for backends expecting it in body
      form.append('session_id', sessionId);
    }
    return firstValueFrom(this.http.post<UploadedFileMeta>(url, form, { params }));
  }

  async getFile(fileId: string): Promise<UploadedFileMeta> {
    // Fetch metadata instead of binary stream
    const url = `${this.base}/files/${fileId}/meta`;
    return firstValueFrom(this.http.get<UploadedFileMeta>(url));
  }

  async list(params?: { type_file?: 'image' | 'pdf' | 'document'; subfolder?: string; page?: number; limit?: number; offset?: number }): Promise<Paginated<UploadedFileMeta>> {
    const url = `${this.base}/files/`;
    const data = await firstValueFrom(this.http.get<any>(url, { params: (params as any) || {} }));
    // Normalize to Paginated using helper
    const pageParams = { page: params?.page ?? (params?.offset && params?.limit ? Math.floor(params.offset / params.limit) + 1 : 1), limit: params?.limit };
    return mapToPaginated<UploadedFileMeta>(data, pageParams);
  }

  async listBySession(sessionId: string): Promise<UploadedFileMeta[]> {
    const url = `${this.base}/files/session/${encodeURIComponent(sessionId)}`;
    return firstValueFrom(this.http.get<UploadedFileMeta[]>(url));
  }
}
