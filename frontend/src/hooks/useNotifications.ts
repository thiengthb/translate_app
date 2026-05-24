import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { notificationApi } from "@/api/features/notification.api";

export function useNotifications(page = 0, size = 20) {
  return useQuery({
    queryKey: ["notifications", page, size],
    queryFn: () => notificationApi.getAll(page, size),
    staleTime: 1000 * 30, // 30 seconds
  });
}

export function useUnreadNotifications(page = 0, size = 10) {
  return useQuery({
    queryKey: ["notifications", "unread", page, size],
    queryFn: () => notificationApi.getUnread(page, size),
    staleTime: 1000 * 15,
    refetchInterval: 1000 * 30, // Poll every 30s
  });
}

export function useUnreadCount() {
  return useQuery({
    queryKey: ["notifications", "unread-count"],
    queryFn: notificationApi.getUnreadCount,
    staleTime: 1000 * 10,
    refetchInterval: 1000 * 30,
  });
}

export function useMarkAsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => notificationApi.markAsRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

export function useMarkAllAsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => notificationApi.markAllAsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}
