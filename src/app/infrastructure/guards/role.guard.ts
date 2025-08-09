import { Injectable, inject } from '@angular/core';
import { CanActivateFn, Router, ActivatedRouteSnapshot } from '@angular/router';
import { TokenStorageService } from '../services/token-storage.service';

@Injectable({ providedIn: 'root' })
export class RoleGuardService {
  private readonly token = inject(TokenStorageService);
  private readonly router = inject(Router);

  canActivate(route: ActivatedRouteSnapshot): boolean {
    const allowed: string[] = route.data?.['roles'] || [];
    // If no roles configured, allow
    if (!allowed.length) return true;

    const role = this.token.getRole();
    if (role && allowed.includes(role)) return true;

    this.router.navigateByUrl('/forbidden');
    return false;
  }
}

export const RoleGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {
  return inject(RoleGuardService).canActivate(route);
};
