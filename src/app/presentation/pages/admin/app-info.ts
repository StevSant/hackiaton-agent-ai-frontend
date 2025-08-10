import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { AdminAppInfoFacade } from '@app/application/admin/admin-app-info.facade';

@Component({
  selector: 'app-admin-app-info',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './app-info.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminAppInfoPage {
  private readonly facade = inject(AdminAppInfoFacade);
  form = this.facade.form;
  loaded = this.facade.loaded;
  error = this.facade.error;
  saving = this.facade.saving;
  saved = this.facade.saved;
  uploadingIcon = this.facade.uploadingIcon;
  uploadingLogo = this.facade.uploadingLogo;

  async ngOnInit() { await this.facade.load(); }

  async save() { await this.facade.save(); }

  async onPickIcon(evt: Event) {
    const input = evt.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    await this.facade.uploadIcon(file);
    input.value = '';
  }

  async onPickLogo(evt: Event) {
    const input = evt.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    await this.facade.uploadLogo(file);
    input.value = '';
  }
}
