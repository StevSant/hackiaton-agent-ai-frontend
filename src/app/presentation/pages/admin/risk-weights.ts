import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormControl } from '@angular/forms';
import { RiskWeightsService } from '@infrastructure/services/risk-weights.service';

@Component({
  selector: 'app-admin-risk-weights',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './risk-weights.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminRiskWeightsPage {
  private readonly api = inject(RiskWeightsService);
  private readonly fb = inject(FormBuilder);

  version = signal<number>(1);
  weights = this.fb.record<number>({});
  loaded = signal(false);
  error = signal<string | null>(null);

  async ngOnInit() {
  const res: any = await this.api.getActive();
  if (res?.weights) {
      this.version.set(res.version || 1);
      this.weights.patchValue(res.weights || {});
    }
    this.loaded.set(true);
  }

  addKey() {
    const key = prompt('Nombre del factor:');
    if (!key) return;
    (this.weights as any).addControl(key, new FormControl(0, { nonNullable: true }));
  }

  async save() {
    try {
      const weights = this.weights.getRawValue() as Record<string, number>;
      await this.api.upsert(this.version(), weights);
      alert('Guardado');
    } catch (e: any) {
      alert(e?.message || 'Error guardando');
    }
  }
}
