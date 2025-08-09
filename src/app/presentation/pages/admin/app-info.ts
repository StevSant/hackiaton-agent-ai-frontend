import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { AppInfoService } from '@infrastructure/services/app-info.service';
import { FilesService } from '@infrastructure/services/files.service';

@Component({
  selector: 'app-admin-app-info',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './app-info.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminAppInfoPage {
  private readonly api = inject(AppInfoService);
  private readonly fb = inject(FormBuilder);
  private readonly files = inject(FilesService);
  form = this.fb.group({ site_name: ['', Validators.required], site_icon: [''], site_logo: [''] });
  loaded = signal(false);
  error = signal<string | null>(null);
  saving = signal(false);
  saved = signal(false);
  uploadingIcon = signal(false);
  uploadingLogo = signal(false);

  async ngOnInit() {
    try {
      const info = await this.api.getAppInfo();
      this.form.patchValue(info as any);
      this.loaded.set(true);
    } catch (e: any) {
      this.error.set(e?.message || 'No se pudo cargar app-info');
    }
  }

  async save() {
    if (this.form.invalid || this.saving()) return;
    this.saving.set(true); this.error.set(null); this.saved.set(false);
    try {
      const res = await this.api.updateAppInfo(this.form.value as any);
      this.form.patchValue(res as any);
      this.saved.set(true);
    } catch (e: any) {
      this.error.set(e?.error?.detail || e?.message || 'No se pudo guardar');
    } finally {
      this.saving.set(false);
      setTimeout(() => this.saved.set(false), 2000);
    }
  }

  async onPickIcon(evt: Event) {
    const input = evt.target as HTMLInputElement;
  const file = input.files?.[0];
    if (!file) return;
    this.uploadingIcon.set(true); this.error.set(null);
    try {
      const meta = await this.files.upload(file, 'app-info');
      this.form.patchValue({ site_icon: meta.url });
    } catch (e: any) {
      this.error.set(e?.error?.detail || e?.message || 'No se pudo subir el icono');
    } finally {
      this.uploadingIcon.set(false);
      input.value = '';
    }
  }

  async onPickLogo(evt: Event) {
    const input = evt.target as HTMLInputElement;
  const file = input.files?.[0];
    if (!file) return;
    this.uploadingLogo.set(true); this.error.set(null);
    try {
      const meta = await this.files.upload(file, 'app-info');
      this.form.patchValue({ site_logo: meta.url });
    } catch (e: any) {
      this.error.set(e?.error?.detail || e?.message || 'No se pudo subir el logo');
    } finally {
      this.uploadingLogo.set(false);
      input.value = '';
    }
  }
}
