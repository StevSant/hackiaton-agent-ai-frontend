import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { AdminRiskWeightsFacade } from '@app/application/admin/admin-risk-weights.facade';

@Component({
  selector: 'app-admin-risk-weights',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './risk-weights.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminRiskWeightsPage {
  private readonly facade = inject(AdminRiskWeightsFacade);

  version = this.facade.version;
  weights = this.facade.weights;
  loaded = this.facade.loaded;
  error = this.facade.error;
  saving = this.facade.saving;

  async ngOnInit() {
  await this.facade.load();
  }

  addKey() {
  this.facade.addKey();
  }

  onVersionChange(event: Event) {
  this.facade.onVersionChange(event);
  }

  async save() {
  await this.facade.save();
  }
}
