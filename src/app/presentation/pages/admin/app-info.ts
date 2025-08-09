import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { AppInfoService } from '@infrastructure/services/app-info.service';

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
  form = this.fb.group({ site_name: ['', Validators.required], site_icon: [''], site_logo: [''] });
  loaded = signal(false);
  error = signal<string | null>(null);

  async ngOnInit() {
    try {
      const info = await this.api.getAppInfo();
      this.form.patchValue(info as any);
      this.loaded.set(true);
    } catch (e: any) {
      this.error.set(e?.message || 'No se pudo cargar app-info');
    }
  }

  // Note: backend lacks update endpoint; we only display.
}
