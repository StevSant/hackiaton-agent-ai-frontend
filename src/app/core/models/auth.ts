export interface LoginRequest {
  username?: string; // allow either username or email
  email?: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  // username is required by backend
  username: string;
}

// Backend login returns nested token + user
export interface LoginSuccessResponse {
  token: { access_token: string; token_type: string };
  user: {
    user_id: string;
    username: string;
    email: string;
    role: string;
    created_at?: string;
  };
}

// Backend register returns basic user (UserBaseResponseDTO)
export interface RegisterSuccessResponse {
  user_id: string;
  username: string;
  email: string;
  role: string;
  created_at?: string;
}

export interface UserProfile {
  id: string;
  username: string;
  email: string;
  role?: string;
}
