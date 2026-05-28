export interface ProfileResponse {
  id: number;
  email: string;
  firstName: string;
  lastName?: string;
  phone?: string;
  bio?: string;
  avatarUrl?: string;
  locale?: string;
  theme?: string;
  roles: string[];
  createdAt: string;
}

export interface UpdateLocaleRequest {
  locale: string;
}

export interface UpdateThemeRequest {
  theme: string;
}

export interface SessionResponse {
  id: number;
  userAgent?: string;
  ipAddress?: string;
  lastUsedAt?: string;
  createdAt: string;
  current: boolean;
}

export interface TotpStatusResponse {
  enabled: boolean;
  remainingRecoveryCodes: number;
}

export interface TotpSetupResponse {
  secret: string;
  qrDataUri: string;
}

export interface EnableTotpRequest {
  code: string;
}

export interface EnableTotpResponse {
  recoveryCodes: string[];
}

export interface DisableTotpRequest {
  currentPassword: string;
}

export interface UpdateProfileRequest {
  firstName: string;
  lastName?: string;
  phone?: string;
  bio?: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface UpdateAvatarRequest {
  avatarUrl: string;
}
