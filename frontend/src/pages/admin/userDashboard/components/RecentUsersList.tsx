import { format } from "date-fns";
import { UserPlus } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { InfoLabel } from "@/components/common/InfoLabel";
import { Badge } from "@/components/ui/badge";
import { formatRoleLabel } from "@/utils/rbac.utils";
import type { RecentUser } from "@/types/features/dashboard";

interface Props {
    users: RecentUser[];
}

export function RecentUsersList({ users }: Props) {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                    <UserPlus size={16} className="text-primary" />
                    <InfoLabel title="Người dùng mới" info="10 tài khoản đăng ký gần nhất" />
                </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
                {users.length === 0 ? (
                    <div className="px-6 py-10 text-center text-sm text-muted-foreground">
                        Chưa có người dùng nào
                    </div>
                ) : (
                    <ul className="divide-y">
                        {users.map((u) => (
                            <li
                                key={u.id}
                                className="flex items-center gap-3 px-6 py-3 hover:bg-muted/30 transition-colors"
                            >
                                <UserAvatar name={u.fullName} avatarUrl={u.avatarUrl} />
                                <div className="min-w-0 flex-1">
                                    <p className="text-sm font-medium text-foreground truncate">
                                        {u.fullName}
                                    </p>
                                    <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                                </div>
                                <div className="hidden sm:flex flex-wrap gap-1 justify-end max-w-32">
                                    {u.roles.slice(0, 2).map((r) => (
                                        <Badge key={r} variant="outline" className="text-[10px]">
                                            {formatRoleLabel(r)}
                                        </Badge>
                                    ))}
                                </div>
                                <span className="text-xs text-muted-foreground whitespace-nowrap tabular-nums">
                                    {u.createdAt ? format(new Date(u.createdAt), "dd/MM") : "—"}
                                </span>
                            </li>
                        ))}
                    </ul>
                )}
            </CardContent>
        </Card>
    );
}

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
                className="h-9 w-9 rounded-full object-cover shrink-0"
            />
        );
    }
    return (
        <div className="h-9 w-9 rounded-full bg-primary/15 text-primary flex items-center justify-center text-xs font-semibold shrink-0">
            {initials || "?"}
        </div>
    );
}
