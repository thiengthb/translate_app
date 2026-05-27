import { useCallback, useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "sonner";

import type { RootState } from "@/store/store";
import { updateProfile as updateProfileAction } from "@/store/slices/auth/authSlice";
import { profileApi } from "@/api/features/profile.api";
import type {
    ChangePasswordRequest,
    ProfileResponse,
    UpdateProfileRequest,
} from "@/types/features/profile";

interface UseProfileReturn {
    profile: ProfileResponse | null;
    loading: boolean;
    setAvatarUrl: (url: string) => void;
    saveInfo: (values: UpdateProfileRequest) => Promise<boolean>;
    changePassword: (values: ChangePasswordRequest) => Promise<boolean>;
}

export function useProfile(): UseProfileReturn {
    const dispatch = useDispatch();
    const { email, firstName, lastName } = useSelector((state: RootState) => state.auth);

    const [profile, setProfile] = useState<ProfileResponse | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;

        profileApi
            .getProfile()
            .then((data) => {
                if (!cancelled) setProfile(data);
            })
            .catch(() => {
                if (cancelled) return;
                setProfile({
                    id: 0,
                    email,
                    firstName,
                    lastName,
                    roles: [],
                    createdAt: new Date().toISOString(),
                });
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, []);

    const setAvatarUrl = useCallback((url: string) => {
        setProfile((p) => (p ? { ...p, avatarUrl: url } : p));
    }, []);

    const saveInfo = useCallback(
        async (values: UpdateProfileRequest): Promise<boolean> => {
            try {
                const updated = await profileApi.updateProfile(values);
                setProfile(updated);
                dispatch(
                    updateProfileAction({
                        firstName: updated.firstName,
                        lastName: updated.lastName,
                    }),
                );
                toast.success("Thông tin đã được cập nhật");
                return true;
            } catch (err: any) {
                toast.error(err?.response?.data?.message ?? "Không thể cập nhật thông tin");
                return false;
            }
        },
        [dispatch],
    );

    const changePassword = useCallback(
        async (values: ChangePasswordRequest): Promise<boolean> => {
            try {
                await profileApi.changePassword(values);
                toast.success("Mật khẩu đã được thay đổi thành công");
                return true;
            } catch (err: any) {
                toast.error(err?.response?.data?.message ?? "Không thể thay đổi mật khẩu");
                return false;
            }
        },
        [],
    );

    return { profile, loading, setAvatarUrl, saveInfo, changePassword };
}
