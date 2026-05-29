import axiosInstance from "../axios";
import type {
  ChangePasswordRequest,
  DisableTotpRequest,
  EnableTotpRequest,
  EnableTotpResponse,
  ProfileResponse,
  SessionResponse,
  TotpSetupResponse,
  TotpStatusResponse,
  UpdateAvatarRequest,
  UpdateLocaleRequest,
  UpdateProfileRequest,
  UpdateThemeRequest,
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

  updateLocale: async (data: UpdateLocaleRequest): Promise<ProfileResponse> => {
    const response = await axiosInstance.patch<ProfileResponse>("/profile/locale", data);
    return response.data;
  },

  updateTheme: async (data: UpdateThemeRequest): Promise<ProfileResponse> => {
    const response = await axiosInstance.patch<ProfileResponse>("/profile/theme", data);
    return response.data;
  },

  listSessions: async (): Promise<SessionResponse[]> => {
    const response = await axiosInstance.get<SessionResponse[]>("/profile/sessions");
    return response.data;
  },

  revokeSession: async (id: number): Promise<void> => {
    await axiosInstance.delete(`/profile/sessions/${id}`);
  },

  getTotpStatus: async (): Promise<TotpStatusResponse> => {
    const response = await axiosInstance.get<TotpStatusResponse>("/profile/2fa");
    return response.data;
  },

  setupTotp: async (): Promise<TotpSetupResponse> => {
    const response = await axiosInstance.post<TotpSetupResponse>("/profile/2fa/setup");
    return response.data;
  },

  enableTotp: async (req: EnableTotpRequest): Promise<EnableTotpResponse> => {
    const response = await axiosInstance.post<EnableTotpResponse>("/profile/2fa/enable", req);
    return response.data;
  },

  disableTotp: async (req: DisableTotpRequest): Promise<void> => {
    await axiosInstance.post("/profile/2fa/disable", req);
  },
};
