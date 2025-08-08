import { Injectable, inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { TokenStorageService } from '../services/token-storage.service';

@Injectable({ providedIn: 'root' })
export class GuestGuardService {
  private token = inject(TokenStorageService);
  private router = inject(Router);
  canActivate(): boolean {
    if (this.token.isAuthenticated()) {
      this.router.navigateByUrl('/');
      return false;
    }
    return true;
  }
}

export const GuestGuard: CanActivateFn = () => {
  return inject(GuestGuardService).canActivate();
};
