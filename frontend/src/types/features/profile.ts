export interface ProfileResponse {
  id: number;
  email: string;
  firstName: string;
  lastName?: string;
  phone?: string;
  bio?: string;
  avatarUrl?: string;
  roles: string[];
  createdAt: string;
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
