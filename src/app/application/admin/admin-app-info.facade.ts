import { inject, Injectable, signal } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import type { AppInfo } from '@core/models';
import type { FilesPort, UploadedFileMeta, AppInfoPort } from '@core/ports';
import { APP_INFO_PORT, FILES_PORT } from '@core/tokens';

@Injectable({ providedIn: 'root' })
export class AdminAppInfoFacade {
  private readonly appInfo = inject<AppInfoPort>(APP_INFO_PORT);
  private readonly files = inject<FilesPort>(FILES_PORT);
  private readonly fb = inject(FormBuilder);

  readonly form = this.fb.group({
    site_name: ['', Validators.required],
    site_icon: [''],
    site_logo: [''],
  });
  readonly loaded = signal(false);
  readonly error = signal<string | null>(null);
  readonly saving = signal(false);
  readonly saved = signal(false);
  readonly uploadingIcon = signal(false);
  readonly uploadingLogo = signal(false);

  async load() {
    try {
      const info = await this.appInfo.getAppInfo();
      this.form.patchValue(info as any);
      this.loaded.set(true);
    } catch (e: any) {
      this.error.set(e?.message || 'No se pudo cargar app-info');
    }
  }

  async save() {
    if (this.form.invalid || this.saving()) return;
    this.saving.set(true);
    this.error.set(null);
    this.saved.set(false);
    try {
      const res = await this.appInfo.updateAppInfo(
        this.form.value as Partial<AppInfo>,
      );
      this.form.patchValue(res as any);
      this.saved.set(true);
    } catch (e: any) {
      this.error.set(e?.message || 'No se pudo guardar');
    } finally {
      this.saving.set(false);
      setTimeout(() => this.saved.set(false), 2000);
    }
  }

  async uploadIcon(file: File) {
    this.uploadingIcon.set(true);
    this.error.set(null);
    try {
      const meta: UploadedFileMeta = await this.files.upload(
        file,
        'app-info',
        'admin-app-info',
      );
      this.form.patchValue({ site_icon: meta.url });
    } catch (e: any) {
      this.error.set(e?.message || 'No se pudo subir el icono');
    } finally {
      this.uploadingIcon.set(false);
    }
  }

  async uploadLogo(file: File) {
    this.uploadingLogo.set(true);
    this.error.set(null);
    try {
      const meta: UploadedFileMeta = await this.files.upload(
        file,
        'app-info',
        'admin-app-info',
      );
      this.form.patchValue({ site_logo: meta.url });
    } catch (e: any) {
      this.error.set(e?.message || 'No se pudo subir el logo');
    } finally {
      this.uploadingLogo.set(false);
    }
  }
}
