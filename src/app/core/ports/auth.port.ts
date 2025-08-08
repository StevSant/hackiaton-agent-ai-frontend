import type { AuthResponse, LoginRequest, RegisterRequest, UserProfile } from '../models/auth';

export interface AuthPort {
  login(payload: LoginRequest): Promise<AuthResponse>;
  register(payload: RegisterRequest): Promise<AuthResponse>;
  getProfile(token: string): Promise<UserProfile>;
}
