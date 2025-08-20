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
  private readonly chartsModal$ = new Subject<{
    open: boolean;
    sessionId?: string | null;
  }>();
  private readonly sidebarControl$ = new Subject<{
    action: 'hide' | 'restore';
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
    this.sidebarControl$.next({ action: 'hide' });
    this.filesModal$.next({ open: true, sessionId });
  }

  closeFilesModal() {
    this.filesModal$.next({ open: false });
    this.sidebarControl$.next({ action: 'restore' });
  }

  onCompaniesModal() {
    return this.companiesModal$.asObservable();
  }

  openCompaniesModal(sessionId?: string | null) {
    this.sidebarControl$.next({ action: 'hide' });
    this.companiesModal$.next({ open: true, sessionId });
  }

  closeCompaniesModal() {
    this.companiesModal$.next({ open: false });
    this.sidebarControl$.next({ action: 'restore' });
  }

  onChartsModal() {
    return this.chartsModal$.asObservable();
  }

  openChartsModal(sessionId?: string | null) {
    this.sidebarControl$.next({ action: 'hide' });
    this.chartsModal$.next({ open: true, sessionId });
  }

  closeChartsModal() {
    this.chartsModal$.next({ open: false });
    this.sidebarControl$.next({ action: 'restore' });
  }

  onSidebarControl() {
    return this.sidebarControl$.asObservable();
  }

  hideSidebar() {
    this.sidebarControl$.next({ action: 'hide' });
  }

  restoreSidebar() {
    this.sidebarControl$.next({ action: 'restore' });
  }
}
