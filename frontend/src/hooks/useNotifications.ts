import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSelector } from "react-redux";
import { notificationApi } from "@/api/features/notification.api";
import type { RootState } from "@/store/store";

// All notification endpoints require auth. Gate every query on the auth flag so
// a guest who lands on a page wrapped in MainLayout (e.g. a leaderboard exposed
// as a public module) doesn't fire 401 polls → /auth/refresh → redirect loop.
const useIsAuthenticated = () =>
  useSelector((s: RootState) => s.auth.isAuthenticated);

export function useNotifications(page = 0, size = 20) {
  const isAuthenticated = useIsAuthenticated();
  return useQuery({
    queryKey: ["notifications", page, size],
    queryFn: () => notificationApi.getAll(page, size),
    enabled: isAuthenticated,
    staleTime: 1000 * 30, // 30 seconds
  });
}

export function useUnreadNotifications(page = 0, size = 10) {
  const isAuthenticated = useIsAuthenticated();
  return useQuery({
    queryKey: ["notifications", "unread", page, size],
    queryFn: () => notificationApi.getUnread(page, size),
    enabled: isAuthenticated,
    staleTime: 1000 * 15,
    refetchInterval: isAuthenticated ? 1000 * 30 : false, // Poll every 30s
  });
}

export function useUnreadCount() {
  const isAuthenticated = useIsAuthenticated();
  return useQuery({
    queryKey: ["notifications", "unread-count"],
    queryFn: notificationApi.getUnreadCount,
    enabled: isAuthenticated,
    staleTime: 1000 * 10,
    refetchInterval: isAuthenticated ? 1000 * 30 : false,
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
