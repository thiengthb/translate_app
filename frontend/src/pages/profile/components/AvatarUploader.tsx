import { useRef, useState } from "react";
import { Camera, Loader2, User } from "lucide-react";
import { toast } from "sonner";

import { profileApi } from "@/api/features/profile.api";
import { fileApi } from "@/api/features/file.api";
import { useTranslation } from "@/contexts/I18nContext";
import type { ProfileResponse } from "@/types/features/profile";
import { AvatarCropModal } from "./AvatarCropModal";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

interface Props {
    profile: ProfileResponse | null;
    onAvatarChange: (url: string) => void;
}

export function AvatarUploader({ profile, onAvatarChange }: Props) {
    const { t } = useTranslation();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [uploading, setUploading] = useState(false);
    const [pickedFile, setPickedFile] = useState<File | null>(null);

    const initials = [profile?.firstName?.charAt(0), profile?.lastName?.charAt(0)]
        .filter(Boolean)
        .join("")
        .toUpperCase();

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (!file.type.startsWith("image/")) {
            toast.error(t("avatar.notImage"));
            return;
        }
        if (file.size > MAX_FILE_SIZE) {
            toast.error(t("avatar.tooLarge"));
            return;
        }
        setPickedFile(file);
        // Reset the input so re-picking the same file fires `onChange` again.
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const handleCropped = async (blob: Blob) => {
        setUploading(true);
        try {
            const cropped = new File([blob], pickedFile?.name ?? "avatar.jpg", {
                type: "image/jpeg",
            });
            const uploaded = await fileApi.upload(cropped, "user-avatar", profile?.id, "avatar");
            await profileApi.updateAvatar({ avatarUrl: uploaded.url });
            onAvatarChange(uploaded.url);
            toast.success(t("avatar.updateSuccess"));
            setPickedFile(null);
        } catch {
            toast.error(t("avatar.uploadFailed"));
        } finally {
            setUploading(false);
        }
    };

    return (
        <>
            <div className="relative">
                {profile?.avatarUrl ? (
                    <img
                        src={profile.avatarUrl}
                        alt="Ảnh đại diện"
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
                    aria-label="Đổi ảnh đại diện"
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

            <AvatarCropModal
                open={pickedFile !== null}
                file={pickedFile}
                busy={uploading}
                onCancel={() => setPickedFile(null)}
                onCropped={handleCropped}
            />
        </>
    );
}
