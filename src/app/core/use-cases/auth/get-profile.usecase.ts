import { inject, Injectable } from '@angular/core';
import type { UserProfile } from '../../models/auth';
import type { AuthPort } from '../../ports/auth.port';
import { AUTH_PORT } from '../../tokens';

@Injectable({ providedIn: 'root' })
export class GetProfileUseCase {
  private auth = inject<AuthPort>(AUTH_PORT);

  async execute(token: string): Promise<UserProfile> {
    return this.auth.getProfile(token);
  }
}
