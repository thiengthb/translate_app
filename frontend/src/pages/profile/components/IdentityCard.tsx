import { format } from "date-fns";
import { CalendarDays, Mail, Phone, Shield } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { formatRoleLabel } from "@/utils/rbac.utils";
import type { ProfileResponse } from "@/types/features/profile";

import { AvatarUploader } from "./AvatarUploader";

interface Props {
    profile: ProfileResponse | null;
    onAvatarChange: (url: string) => void;
}

export function IdentityCard({ profile, onAvatarChange }: Props) {
    const fullName =
        [profile?.firstName, profile?.lastName].filter(Boolean).join(" ") || "—";

    return (
        <Card className="overflow-hidden p-0 gap-0">
            <div className="h-24 bg-gradient-to-r from-primary/80 via-primary to-primary/60" />

            <CardContent className="px-6 pb-6">
                <div className="flex flex-col sm:flex-row sm:items-end gap-4 -mt-14">
                    <AvatarUploader profile={profile} onAvatarChange={onAvatarChange} />
                    <div className="sm:pb-2 flex-1 min-w-0 space-y-1.5">
                        <h1 className="text-xl font-bold text-foreground leading-tight truncate">
                            {fullName}
                        </h1>
                        <div className="flex flex-wrap gap-1.5">
                            {(profile?.roles ?? []).map((r) => (
                                <Badge key={r} variant="secondary" className="text-[11px] gap-1">
                                    <Shield size={10} />
                                    {formatRoleLabel(r)}
                                </Badge>
                            ))}
                        </div>
                    </div>
                </div>

                <Separator className="my-5" />

                <div className="space-y-3">
                    <ContactRow icon={<Mail size={14} />} label="Email" value={profile?.email} />
                    <ContactRow
                        icon={<Phone size={14} />}
                        label="Số điện thoại"
                        value={profile?.phone || "Chưa cập nhật"}
                        muted={!profile?.phone}
                    />
                    <ContactRow
                        icon={<CalendarDays size={14} />}
                        label="Tham gia từ"
                        value={
                            profile?.createdAt
                                ? format(new Date(profile.createdAt), "dd/MM/yyyy")
                                : "—"
                        }
                    />
                </div>

                {profile?.bio && (
                    <>
                        <Separator className="my-5" />
                        <div className="space-y-1.5">
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                Giới thiệu
                            </p>
                            <p className="text-sm text-foreground leading-relaxed whitespace-pre-line">
                                {profile.bio}
                            </p>
                        </div>
                    </>
                )}
            </CardContent>
        </Card>
    );
}

function ContactRow({
    icon,
    label,
    value,
    muted,
}: {
    icon: React.ReactNode;
    label: string;
    value?: string;
    muted?: boolean;
}) {
    return (
        <div className="flex items-center gap-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-muted text-muted-foreground shrink-0">
                {icon}
            </span>
            <div className="min-w-0 flex-1">
                <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                    {label}
                </p>
                <p
                    className={`text-sm truncate ${
                        muted ? "text-muted-foreground italic" : "text-foreground"
                    }`}
                >
                    {value || "—"}
                </p>
            </div>
        </div>
    );
}
