import { Injectable, inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { TokenStorageService } from '../services/token-storage.service';

@Injectable({ providedIn: 'root' })
export class AuthGuardService {
  private token = inject(TokenStorageService);
  private router = inject(Router);
  canActivate(): boolean {
    if (!this.token.isAuthenticated()) {
      this.router.navigateByUrl('/login');
      return false;
    }
    return true;
  }
}

export const AuthGuard: CanActivateFn = () => {
  return inject(AuthGuardService).canActivate();
};
