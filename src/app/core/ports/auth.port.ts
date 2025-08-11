import type {
  LoginRequest,
  RegisterRequest,
  UserProfile,
  LoginSuccessResponse,
  RegisterSuccessResponse,
} from '../models/auth';

export interface AuthPort {
  login(payload: LoginRequest): Promise<LoginSuccessResponse>;
  register(payload: RegisterRequest): Promise<RegisterSuccessResponse>;
  getProfile(token: string): Promise<UserProfile>;
}
