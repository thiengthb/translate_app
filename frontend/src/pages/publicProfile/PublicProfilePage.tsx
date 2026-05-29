import { format } from "date-fns";
import { useNavigate, useParams } from "react-router-dom";
import {
    ArrowLeft,
    CalendarDays,
    Flame,
    Loader2,
    ShieldOff,
    Target,
    Trophy,
    User as UserIcon,
} from "lucide-react";

import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { formatRoleLabel } from "@/utils/rbac.utils";
import { usePublicProfile } from "@/hooks/useLeaderboard";

export default function PublicProfilePage() {
    const { userId } = useParams<{ userId: string }>();
    const navigate = useNavigate();
    const { data: profile, isLoading, isError } = usePublicProfile(userId);

    if (isLoading) {
        return (
            <MainLayout>
                <div className="flex items-center justify-center h-64">
                    <Loader2 className="animate-spin text-primary" size={32} />
                </div>
            </MainLayout>
        );
    }

    if (isError || !profile) {
        return (
            <MainLayout>
                <div className="max-w-md mx-auto pt-16 text-center">
                    <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-muted text-muted-foreground mb-4">
                        <ShieldOff size={28} />
                    </div>
                    <h2 className="text-xl font-semibold text-foreground">
                        Không thể xem hồ sơ
                    </h2>
                    <p className="text-sm text-muted-foreground mt-2">
                        Hồ sơ này không tồn tại hoặc không được công khai.
                    </p>
                    <Button onClick={() => navigate(-1)} variant="outline" className="mt-6 gap-2">
                        <ArrowLeft size={14} />
                        Quay lại
                    </Button>
                </div>
            </MainLayout>
        );
    }

    return (
        <MainLayout>
            <div className="w-full space-y-6">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate(-1)}
                    className="gap-1.5 -ml-2"
                >
                    <ArrowLeft size={14} />
                    Quay lại
                </Button>

                {/* ─── Hero card ──────────────────────────────────────────── */}
                <Card className="overflow-hidden p-0 gap-0">
                    <div className="h-28 sm:h-32 bg-gradient-to-r from-primary/80 via-primary to-primary/60" />
                    <CardContent className="px-6 pb-6">
                        <div className="flex flex-col sm:flex-row sm:items-end gap-4 -mt-14">
                            <UserAvatar name={profile.fullName} avatarUrl={profile.avatarUrl} />
                            <div className="sm:pb-2 flex-1 min-w-0 space-y-1.5">
                                <h1 className="text-2xl font-bold text-foreground leading-tight truncate">
                                    {profile.fullName}
                                </h1>
                                <div className="flex flex-wrap gap-1.5">
                                    {profile.roles.map((r) => (
                                        <Badge
                                            key={r}
                                            variant="secondary"
                                            className="text-[11px]"
                                        >
                                            {formatRoleLabel(r)}
                                        </Badge>
                                    ))}
                                </div>
                                {profile.createdAt && (
                                    <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                                        <CalendarDays size={13} />
                                        Tham gia từ{" "}
                                        {format(new Date(profile.createdAt), "dd/MM/yyyy")}
                                    </p>
                                )}
                            </div>
                        </div>

                        {profile.bio && (
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

                {/* ─── Streak stats ──────────────────────────────────────── */}
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                            <Flame size={16} className="text-orange-500 fill-orange-500" />
                            Hoạt động
                        </CardTitle>
                        <CardDescription>Mức độ tương tác của người dùng này</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <StatTile
                                icon={<Flame size={18} />}
                                label="Streak hiện tại"
                                value={profile.streak.currentStreak}
                                suffix="ngày"
                                accent
                            />
                            <StatTile
                                icon={<Trophy size={18} />}
                                label="Dài nhất"
                                value={profile.streak.longestStreak}
                                suffix="ngày"
                            />
                            <StatTile
                                icon={<Target size={18} />}
                                label="Tổng ngày"
                                value={profile.streak.totalActiveDays}
                                suffix="ngày"
                            />
                            <StatTile
                                icon={<CalendarDays size={18} />}
                                label="Lần cuối"
                                value={
                                    profile.streak.lastActivityDate
                                        ? format(new Date(profile.streak.lastActivityDate), "dd/MM")
                                        : "—"
                                }
                            />
                        </div>
                    </CardContent>
                </Card>
            </div>
        </MainLayout>
    );
}

// ─── Sub-components ────────────────────────────────────────────────────────

function UserAvatar({ name, avatarUrl }: { name: string; avatarUrl?: string | null }) {
    const initials = name
        .split(" ")
        .map((p) => p.charAt(0))
        .filter(Boolean)
        .slice(0, 2)
        .join("")
        .toUpperCase();
    if (avatarUrl) {
        return (
            <img
                src={avatarUrl}
                alt={name}
                className="h-24 w-24 sm:h-28 sm:w-28 rounded-full object-cover ring-4 ring-background shadow-lg"
            />
        );
    }
    return (
        <div className="h-24 w-24 sm:h-28 sm:w-28 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-2xl sm:text-3xl font-bold ring-4 ring-background shadow-lg">
            {initials || <UserIcon size={36} />}
        </div>
    );
}

function StatTile({
    icon,
    label,
    value,
    suffix,
    accent,
}: {
    icon: React.ReactNode;
    label: string;
    value: number | string;
    suffix?: string;
    accent?: boolean;
}) {
    return (
        <div className="rounded-lg border bg-card p-4">
            <div className="flex items-center gap-2 mb-2">
                <div
                    className={`flex h-7 w-7 items-center justify-center rounded-md ${
                        accent
                            ? "bg-orange-500/15 text-orange-600 dark:text-orange-400"
                            : "bg-primary/10 text-primary"
                    }`}
                >
                    {icon}
                </div>
                <span className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">
                    {label}
                </span>
            </div>
            <div className="flex items-baseline gap-1">
                <span
                    className={`text-2xl font-bold tabular-nums ${
                        accent ? "text-orange-600 dark:text-orange-400" : "text-foreground"
                    }`}
                >
                    {value}
                </span>
                {suffix && <span className="text-xs text-muted-foreground">{suffix}</span>}
            </div>
        </div>
    );
}
