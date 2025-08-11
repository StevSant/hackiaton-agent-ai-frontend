import type { Kpis } from '../models';

export interface KpisPort {
  getKpis(): Promise<Kpis>;
}
