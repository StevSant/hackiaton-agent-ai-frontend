import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

/**
 * Lightweight event bus to notify when sessions should refresh.
 */
@Injectable({ providedIn: 'root' })
export class SessionsEventsService {
  private readonly refresh$ = new Subject<void>();

  onRefresh() {
    return this.refresh$.asObservable();
  }

  triggerRefresh() {
    this.refresh$.next();
  }
}
