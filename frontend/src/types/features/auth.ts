export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  locale?: string;
  theme?: string;
  roles: string[];
  permissions: string[];
  rolePermissions: Record<string, string[]>;
  /** Set when the account has 2FA enabled — caller must show the challenge. */
  requiresTotp?: boolean;
  tempToken?: string;
}

export interface TwoFactorLoginRequest {
  tempToken: string;
  code: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  confirmPassword: string;
}
export interface VerifyRequest {
  email: string;
  code: string;
}

export interface ForgotPasswordEmailRequest {
  email: string;
}

export interface ForgotPasswordRequest {
  token: string;
  newPassword: string;
}
export interface ResetPasswordData {
  password: string;
  confirmPassword: string;
}
export interface AuthState {
  token: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  locale: string;
  theme: string;
  roles: string[];
  permissions: string[];
  rolePermissions: Record<string, string[]>;
  isAuthenticated: boolean;
}
