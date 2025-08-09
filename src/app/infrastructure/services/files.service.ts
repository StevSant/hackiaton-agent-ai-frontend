import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '@environments/environment';
import { firstValueFrom } from 'rxjs';

export interface UploadedFileMeta {
  id: string;
  url: string;
  filename: string;
  content_type: string;
  type_file: 'image' | 'pdf' | 'document';
  converted?: boolean;
  original_extension?: string | null;
}

export interface ListFilesResponse {
  total: number;
  items: UploadedFileMeta[];
}

@Injectable({ providedIn: 'root' })
export class FilesService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.baseUrl;

  async upload(file: File, subfolder = ''): Promise<UploadedFileMeta> {
    const form = new FormData();
    form.append('upload', file);
    form.append('subfolder', subfolder);
    const url = `${this.base}/files/`;
    return firstValueFrom(this.http.post<UploadedFileMeta>(url, form));
  }

  async getFile(fileId: string): Promise<UploadedFileMeta> {
    const url = `${this.base}/files/${fileId}`;
    return firstValueFrom(this.http.get<UploadedFileMeta>(url));
  }

  async list(params?: { type_file?: 'image' | 'pdf' | 'document'; subfolder?: string; limit?: number; offset?: number }): Promise<ListFilesResponse> {
    const url = `${this.base}/files/`;
    return firstValueFrom(this.http.get<ListFilesResponse>(url, { params: (params as any) || {} }));
  }
}
