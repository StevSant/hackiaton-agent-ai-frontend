export interface LoginRequest {
  username?: string; // allow either username or email
  email?: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  // username optional (frontend only, backend ignores)
  username?: string;
}

// Backend login returns nested token + user
export interface LoginSuccessResponse {
  token: { access_token: string; token_type: string };
  user: { user_id: string; email: string; created_at?: string };
}

// Backend register returns basic user (UserBaseResponseDTO)
export interface RegisterSuccessResponse {
  user_id: string;
  email: string;
  created_at?: string;
}

export interface UserProfile {
  id: string;
  username: string;
  email: string;
}
