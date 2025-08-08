export interface LoginRequest {
  username?: string; // allow either username or email
  email?: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string; // JWT or similar
}

export interface UserProfile {
  id: string;
  username: string;
  email: string;
}
