import { Injectable, inject, signal } from '@angular/core';
import { AdminStatsDTO } from '@core/ports/admin-stats.port';
import { AdminStatsService } from '@infrastructure/services/admin-stats.service';

@Injectable({ providedIn: 'root' })
export class AdminStatsFacade {
	private readonly api = inject(AdminStatsService);

	readonly loading = signal(false);
	readonly data = signal<AdminStatsDTO | null>(null);
	readonly error = signal<string | null>(null);

	async load(days = 30): Promise<void> {
		if (this.loading()) return;
		this.loading.set(true);
		this.error.set(null);
		try {
			const res = await this.api.getOverview(days);
			this.data.set(res);
		} catch (e: any) {
			this.error.set(e?.message ?? 'Failed to load stats');
		} finally {
			this.loading.set(false);
		}
	}
}
