import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

/**
 * Lightweight event bus to notify when sessions should refresh.
 */
@Injectable({ providedIn: 'root' })
export class SessionsEventsService {
  private readonly refresh$ = new Subject<void>();
  private readonly filesModal$ = new Subject<{
    open: boolean;
    sessionId?: string | null;
  }>();
  private readonly companiesModal$ = new Subject<{
    open: boolean;
    sessionId?: string | null;
  }>();

  onRefresh() {
    return this.refresh$.asObservable();
  }

  triggerRefresh() {
    this.refresh$.next();
  }

  onFilesModal() {
    return this.filesModal$.asObservable();
  }

  openFilesModal(sessionId?: string | null) {
    this.filesModal$.next({ open: true, sessionId });
  }

  closeFilesModal() {
    this.filesModal$.next({ open: false });
  }

  onCompaniesModal() {
    return this.companiesModal$.asObservable();
  }

  openCompaniesModal(sessionId?: string | null) {
    this.companiesModal$.next({ open: true, sessionId });
  }

  closeCompaniesModal() {
    this.companiesModal$.next({ open: false });
  }
}
