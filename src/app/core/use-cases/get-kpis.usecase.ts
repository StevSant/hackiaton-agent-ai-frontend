import { inject, Injectable } from '@angular/core';
import type { Kpis } from '../models/kpi';
import type { KpisPort } from '../ports/kpis.port';
import { KPIS_PORT } from '../tokens';

@Injectable({ providedIn: 'root' })
export class GetKpisUseCase {
  private kpis = inject<KpisPort>(KPIS_PORT);

  execute(): Promise<Kpis> {
    return this.kpis.getKpis();
  }
}
