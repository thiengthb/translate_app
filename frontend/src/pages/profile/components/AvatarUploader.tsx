import { useRef, useState } from "react";
import { Camera, Loader2, User } from "lucide-react";
import { toast } from "sonner";

import { profileApi } from "@/api/features/profile.api";
import { fileApi } from "@/api/features/file.api";
import type { ProfileResponse } from "@/types/features/profile";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

interface Props {
    profile: ProfileResponse | null;
    onAvatarChange: (url: string) => void;
}

export function AvatarUploader({ profile, onAvatarChange }: Props) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [uploading, setUploading] = useState(false);

    const initials = [profile?.firstName?.charAt(0), profile?.lastName?.charAt(0)]
        .filter(Boolean)
        .join("")
        .toUpperCase();

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (!file.type.startsWith("image/")) {
            toast.error("Vui lòng chọn file ảnh");
            return;
        }
        if (file.size > MAX_FILE_SIZE) {
            toast.error("Ảnh phải nhỏ hơn 5MB");
            return;
        }

        setUploading(true);
        try {
            const uploaded = await fileApi.upload(file, "user-avatar", profile?.id, "avatar");
            await profileApi.updateAvatar({ avatarUrl: uploaded.url });
            onAvatarChange(uploaded.url);
            toast.success("Ảnh đại diện đã được cập nhật");
        } catch {
            toast.error("Không thể tải ảnh lên");
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    return (
        <div className="relative">
            {profile?.avatarUrl ? (
                <img
                    src={profile.avatarUrl}
                    alt="Avatar"
                    className="h-28 w-28 rounded-full object-cover ring-4 ring-background shadow-lg"
                />
            ) : (
                <div className="h-28 w-28 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-3xl font-bold ring-4 ring-background shadow-lg">
                    {initials || <User size={36} />}
                </div>
            )}

            <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="absolute bottom-1 right-1 h-8 w-8 rounded-full bg-background border text-foreground flex items-center justify-center hover:bg-accent transition-colors shadow-md cursor-pointer disabled:opacity-60"
                aria-label="Change avatar"
            >
                {uploading ? (
                    <Loader2 size={14} className="animate-spin" />
                ) : (
                    <Camera size={14} />
                )}
            </button>
            <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
            />
        </div>
    );
}
