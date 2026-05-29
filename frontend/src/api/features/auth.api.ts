import axiosInstance from "../axios";
import { authStorage, mapAuthResponse, type BackendAuthResponse } from "@/lib/auth-storage";
import {
    type ForgotPasswordEmailRequest,
    type ForgotPasswordRequest,
    type LoginRequest,
    type LoginResponse,
    type RegisterRequest,
    type TwoFactorLoginRequest,
} from "../../types/features/auth";

export const authApi = {
    login: async (credentials: LoginRequest): Promise<LoginResponse> => {
        const response = await axiosInstance.post<BackendAuthResponse>("/auth/login", {
            email: credentials.email,
            password: credentials.password,
        });
        return mapAuthResponse(response.data) as LoginResponse;
    },

    completeTwoFactor: async (req: TwoFactorLoginRequest): Promise<LoginResponse> => {
        const response = await axiosInstance.post<BackendAuthResponse>(
            "/auth/login/2fa",
            req,
        );
        return mapAuthResponse(response.data) as LoginResponse;
    },

    logout: async () => {
        try {
            await axiosInstance.post("/auth/logout");
        } finally {
            authStorage.clear();
        }
    },

    logoutAllDevices: async () => {
        try {
            await axiosInstance.post("/auth/logout-all");
        } finally {
            authStorage.clear();
        }
    },

    register: async (data: RegisterRequest): Promise<void> => {
        await axiosInstance.post("/auth/register", data);
    },

    resendVerification: async (email: string): Promise<void> => {
        await axiosInstance.post("/auth/resend-verification", null, { params: { email } });
    },

    forgotPassword: async (data: ForgotPasswordEmailRequest): Promise<void> => {
        await axiosInstance.post("/auth/forgot-password", { email: data.email });
    },

    resetPassword: async (data: ForgotPasswordRequest): Promise<void> => {
        await axiosInstance.patch("/auth/reset-password", {
            token: data.token,
            newPassword: data.newPassword,
        });
    },
};
