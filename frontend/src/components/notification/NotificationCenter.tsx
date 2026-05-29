import { Bell, CheckCheck } from "lucide-react";
import { useCallback, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useUnreadCount, useUnreadNotifications, useMarkAsRead, useMarkAllAsRead } from "@/hooks/useNotifications";
import { useWebSocket } from "@/hooks/useWebSocket";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";

dayjs.extend(relativeTime);

const typeColors: Record<string, string> = {
  INFO: "bg-primary/15 text-primary",
  SUCCESS: "bg-green-100 text-green-700",
  WARNING: "bg-yellow-100 text-yellow-700",
  ERROR: "bg-red-100 text-red-700",
  SYSTEM: "bg-purple-100 text-purple-700",
};

export default function NotificationCenter() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: unreadCount = 0 } = useUnreadCount();
  const { data: notifications } = useUnreadNotifications(0, 10);
  const markAsRead = useMarkAsRead();
  const markAllAsRead = useMarkAllAsRead();

  // Live push: when the BE sends a notification over STOMP, refresh the cached
  // unread list + count immediately instead of waiting for the 30s poll.
  const onNotification = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["notifications"] });
  }, [queryClient]);
  useWebSocket({ onNotification });

  const handleNotificationClick = (notification: any) => {
    markAsRead.mutate(notification.id);
    if (notification.actionUrl) {
      navigate(notification.actionUrl);
    }
    setOpen(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative p-2 rounded-full hover:bg-accent transition-colors cursor-pointer"
        aria-label="Notifications"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 h-4 min-w-4 flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold px-1">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />

          {/* Dropdown */}
          <div className="absolute right-0 top-full mt-2 w-80 bg-background border rounded-lg shadow-lg z-50 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <span className="font-semibold text-sm">Notifications</span>
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => markAllAsRead.mutate()}
                >
                  <CheckCheck size={14} className="mr-1" />
                  Mark all read
                </Button>
              )}
            </div>

            <div className="max-h-80 overflow-y-auto">
              {!notifications?.content?.length ? (
                <div className="px-4 py-8 text-center text-muted-foreground text-sm">
                  Không có thông báo mới
                </div>
              ) : (
                notifications.content.map((n) => (
                  <div
                    key={n.id}
                    onClick={() => handleNotificationClick(n)}
                    className="flex items-start gap-3 px-4 py-3 hover:bg-accent/50 cursor-pointer border-b last:border-b-0 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm truncate">
                          {n.title}
                        </span>
                        <Badge
                          variant="secondary"
                          className={`text-[10px] px-1.5 py-0 ${typeColors[n.type] || ""}`}
                        >
                          {n.type}
                        </Badge>
                      </div>
                      {n.message && (
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                          {n.message}
                        </p>
                      )}
                      <span className="text-[11px] text-muted-foreground mt-1 block">
                        {dayjs(n.createdAt).fromNow()}
                      </span>
                    </div>
                    {!n.isRead && (
                      <div className="mt-1.5 h-2 w-2 rounded-full bg-primary shrink-0" />
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Footer: deep-link to the full inbox so users can browse
                past notifications, filter unread, mark-all etc. */}
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                navigate("/notifications");
              }}
              className="w-full border-t px-4 py-2.5 text-xs font-medium text-center text-primary hover:bg-accent transition-colors cursor-pointer"
            >
              Xem tất cả thông báo →
            </button>
          </div>
        </>
      )}
    </div>
  );
}
