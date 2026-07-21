import { useRef, useState } from "react";
import { Camera, Loader2, User } from "lucide-react";
import { motion, useMotionValue, useSpring, useTransform } from "motion/react";
import { toast } from "sonner";

import { profileApi } from "@/api/features/profile.api";
import { fileApi } from "@/api/features/file.api";
import { useTranslation } from "@/contexts/I18nContext";
import { usePrefersReducedMotion } from "@/pages/portfolio/usePrefersReducedMotion";
import type { ProfileResponse } from "@/types/features/profile";
import { AvatarCropModal } from "./AvatarCropModal";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

interface Props {
    profile: ProfileResponse | null;
    onAvatarChange: (url: string) => void;
    /** Diameter in px. */
    size?: number;
}

export function AvatarUploader({ profile, onAvatarChange, size = 132 }: Props) {
    const { t } = useTranslation();
    const reduce = usePrefersReducedMotion();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [uploading, setUploading] = useState(false);
    const [pickedFile, setPickedFile] = useState<File | null>(null);

    // ── 3D tilt: track the cursor over the avatar and map it to a gentle
    //    rotateX/rotateY. Springs smooth the motion; reduced-motion disables it.
    const mx = useMotionValue(0);
    const my = useMotionValue(0);
    const rotateX = useSpring(useTransform(my, [-0.5, 0.5], [10, -10]), {
        stiffness: 180,
        damping: 14,
    });
    const rotateY = useSpring(useTransform(mx, [-0.5, 0.5], [-10, 10]), {
        stiffness: 180,
        damping: 14,
    });

    const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
        if (reduce) return;
        const rect = e.currentTarget.getBoundingClientRect();
        mx.set((e.clientX - rect.left) / rect.width - 0.5);
        my.set((e.clientY - rect.top) / rect.height - 0.5);
    };
    const handlePointerLeave = () => {
        mx.set(0);
        my.set(0);
    };

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
            <motion.div
                onPointerMove={handlePointerMove}
                onPointerLeave={handlePointerLeave}
                style={reduce ? undefined : { rotateX, rotateY, transformPerspective: 600 }}
                className="group relative shrink-0"
            >
                {/* Soft pink halo that pulses gently and brightens on hover. */}
                <motion.span
                    aria-hidden
                    className="absolute -inset-3 rounded-full bg-[radial-gradient(circle,rgba(255,143,171,0.55),transparent_70%)] blur-md"
                    animate={reduce ? undefined : { opacity: [0.5, 0.85, 0.5], scale: [1, 1.06, 1] }}
                    transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
                />

                <div
                    className="relative rounded-full p-[3px]"
                    style={{ width: size, height: size, transform: "translateZ(30px)" }}
                >
                    {/* Gradient ring frame. */}
                    <div className="h-full w-full rounded-full bg-gradient-to-br from-primary via-[#ff8fab] to-[#ffc2d4] p-[3px] shadow-[0_16px_40px_-14px_rgba(255,107,157,0.85)]">
                        {profile?.avatarUrl ? (
                            <img
                                src={profile.avatarUrl}
                                alt="Ảnh đại diện"
                                className="h-full w-full rounded-full object-cover ring-4 ring-white"
                            />
                        ) : (
                            <div className="flex h-full w-full items-center justify-center rounded-full bg-white text-3xl font-bold text-primary ring-4 ring-white">
                                {initials || <User size={size * 0.32} />}
                            </div>
                        )}
                    </div>

                    {/* Camera overlay — scales + rotates in on hover. */}
                    <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                        style={{ transform: "translateZ(45px)" }}
                        className="absolute bottom-1 right-1 flex h-9 w-9 items-center justify-center rounded-full border border-white bg-white text-primary shadow-lg transition-all duration-300 hover:scale-110 hover:rotate-6 hover:bg-primary hover:text-white disabled:opacity-60 cursor-pointer"
                        aria-label="Đổi ảnh đại diện"
                    >
                        {uploading ? (
                            <Loader2 size={15} className="animate-spin" />
                        ) : (
                            <Camera size={15} className="transition-transform duration-300 group-hover:scale-105" />
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
            </motion.div>

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
