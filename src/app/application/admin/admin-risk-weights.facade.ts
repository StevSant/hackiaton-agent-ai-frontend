import { inject, Injectable, signal } from '@angular/core';
import { FormBuilder, FormControl } from '@angular/forms';
import { GetActiveRiskWeightsUseCase } from '@core/use-cases/risk-weights/get-active-risk-weights.usecase';
import { UpsertRiskWeightsUseCase } from '@core/use-cases/risk-weights/upsert-risk-weights.usecase';

@Injectable({ providedIn: 'root' })
export class AdminRiskWeightsFacade {
  private readonly getActive = inject(GetActiveRiskWeightsUseCase);
  private readonly upsert = inject(UpsertRiskWeightsUseCase);
  private readonly fb = inject(FormBuilder);

  version = signal<number>(1);
  weights = this.fb.record<number>({});
  loaded = signal(false);
  error = signal<string | null>(null);
  saving = signal(false);

  async load() {
    this.error.set(null);
    try {
      const res: any = await this.getActive.execute();
      if (res?.weights) {
        this.version.set((res as any).version || 1);
        this.weights.patchValue(res.weights || {});
      }
      this.loaded.set(true);
    } catch (e: any) {
      this.error.set(e?.message || 'Error cargando configuración');
    }
  }

  addKey() {
    const key = prompt('Nombre del factor:');
    if (!key) return;
    (this.weights as any).addControl(key, new FormControl(0, { nonNullable: true }));
  }

  onVersionChange(event: Event) {
    const input = event.target as HTMLInputElement;
    this.version.set(input.valueAsNumber || 1);
  }

  async save() {
    this.saving.set(true);
    this.error.set(null);
    try {
      const weights = this.weights.getRawValue() as Record<string, number>;
      await this.upsert.execute(this.version(), weights);
    } catch (e: any) {
      this.error.set(e?.message || 'Error guardando');
    } finally {
      this.saving.set(false);
    }
  }
}
