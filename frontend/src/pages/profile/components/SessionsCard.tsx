import { useEffect, useState } from "react";
import { Laptop, Loader2, LogOut, Monitor } from "lucide-react";
import { toast } from "sonner";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { profileApi } from "@/api/features/profile.api";
import { useTranslation } from "@/contexts/I18nContext";
import { useFormat } from "@/i18n/format";
import type { SessionResponse } from "@/types/features/profile";

function shortUserAgent(ua?: string): string | null {
    if (!ua) return null;
    // Best-effort browser + OS extraction. Full UA parsing is overkill for a
    // settings screen — we just want something recognisable.
    const browserMatch =
        ua.match(/Edg\/([\d.]+)/) ||
        ua.match(/Chrome\/([\d.]+)/) ||
        ua.match(/Firefox\/([\d.]+)/) ||
        ua.match(/Safari\/([\d.]+)/);
    const browser = browserMatch
        ? browserMatch[0].split("/")[0].replace("Edg", "Edge")
        : "Browser";
    const osMatch =
        ua.match(/Windows NT [\d.]+/) ||
        ua.match(/Mac OS X [\d_]+/) ||
        ua.match(/Android [\d.]+/) ||
        ua.match(/iPhone OS [\d_]+/) ||
        ua.match(/Linux/);
    const os = osMatch ? osMatch[0].replace(/_/g, ".") : "";
    return os ? `${browser} • ${os}` : browser;
}

export function SessionsCard() {
    const { t } = useTranslation();
    const fmt = useFormat();
    const [sessions, setSessions] = useState<SessionResponse[]>([]);
    const [loading, setLoading] = useState(true);
    const [revokingId, setRevokingId] = useState<number | null>(null);

    const refresh = async () => {
        try {
            const data = await profileApi.listSessions();
            setSessions(data);
        } catch {
            toast.error(t("profile.sessions.loadFailed"));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        refresh();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleRevoke = async (id: number) => {
        if (!window.confirm(t("profile.sessions.revokeConfirm"))) return;
        setRevokingId(id);
        try {
            await profileApi.revokeSession(id);
            toast.success(t("profile.sessions.revokeSuccess"));
            setSessions((prev) => prev.filter((s) => s.id !== id));
        } catch {
            toast.error(t("profile.sessions.revokeFailed"));
        } finally {
            setRevokingId(null);
        }
    };

    return (
        <Card>
            <CardHeader className="pb-4">
                <CardTitle className="text-base flex items-center gap-2">
                    <Monitor size={16} className="text-primary" />
                    {t("profile.sessions.title")}
                </CardTitle>
                <CardDescription>{t("profile.sessions.description")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-1">
                {loading ? (
                    <div className="flex justify-center py-6">
                        <Loader2 size={20} className="animate-spin text-primary" />
                    </div>
                ) : sessions.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4 text-center">
                        {t("profile.sessions.empty")}
                    </p>
                ) : (
                    sessions.map((s, idx) => {
                        const label = shortUserAgent(s.userAgent) ?? t("profile.sessions.unknown");
                        return (
                            <div key={s.id}>
                                {idx > 0 && <Separator className="my-2" />}
                                <div className="flex items-start gap-3 py-2">
                                    <Laptop size={18} className="mt-0.5 text-muted-foreground" />
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="text-sm font-medium text-foreground truncate">
                                                {label}
                                            </span>
                                            {s.current && (
                                                <Badge
                                                    variant="secondary"
                                                    className="bg-primary/10 text-primary border-0 text-[10px]"
                                                >
                                                    {t("profile.sessions.current")}
                                                </Badge>
                                            )}
                                        </div>
                                        <div className="text-xs text-muted-foreground space-y-0.5 mt-0.5">
                                            {s.ipAddress && <p>{s.ipAddress}</p>}
                                            {s.lastUsedAt && (
                                                <p>
                                                    {t("profile.sessions.lastUsed")}:{" "}
                                                    {fmt.relative(s.lastUsedAt)}
                                                </p>
                                            )}
                                            <p>
                                                {t("profile.sessions.created")}:{" "}
                                                {fmt.dateTime(s.createdAt)}
                                            </p>
                                        </div>
                                    </div>
                                    {!s.current && (
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            disabled={revokingId === s.id}
                                            onClick={() => handleRevoke(s.id)}
                                            className="gap-1.5 text-destructive hover:bg-destructive/10 hover:text-destructive"
                                        >
                                            {revokingId === s.id ? (
                                                <Loader2 size={14} className="animate-spin" />
                                            ) : (
                                                <LogOut size={14} />
                                            )}
                                            <span className="hidden sm:inline">
                                                {revokingId === s.id
                                                    ? t("profile.sessions.revoking")
                                                    : t("profile.sessions.revoke")}
                                            </span>
                                        </Button>
                                    )}
                                </div>
                            </div>
                        );
                    })
                )}
            </CardContent>
        </Card>
    );
}
