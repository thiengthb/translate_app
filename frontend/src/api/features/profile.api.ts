import axiosInstance from "../axios";
import type {
  ChangePasswordRequest,
  ProfileResponse,
  UpdateAvatarRequest,
  UpdateProfileRequest,
} from "@/types/features/profile";

export const profileApi = {
  getProfile: async (): Promise<ProfileResponse> => {
    const response = await axiosInstance.get<ProfileResponse>("/profile");
    return response.data;
  },

  updateProfile: async (data: UpdateProfileRequest): Promise<ProfileResponse> => {
    const response = await axiosInstance.patch<ProfileResponse>("/profile", data);
    return response.data;
  },

  changePassword: async (data: ChangePasswordRequest): Promise<void> => {
    await axiosInstance.patch("/profile/password", data);
  },

  updateAvatar: async (data: UpdateAvatarRequest): Promise<ProfileResponse> => {
    const response = await axiosInstance.patch<ProfileResponse>("/profile/avatar", data);
    return response.data;
  },
};
