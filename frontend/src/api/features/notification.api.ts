import axiosInstance from "../axios";

// ---- Types ----

export interface NotificationDTO {
  id: number;
  userId: number;
  title: string;
  message: string;
  type: "INFO" | "SUCCESS" | "WARNING" | "ERROR" | "SYSTEM";
  entityName?: string;
  entityId?: number;
  actionUrl?: string;
  isRead: boolean;
  createdAt: string;
}

export interface NotificationPage {
  content: NotificationDTO[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

// ---- API ----

export const notificationApi = {
  getAll: async (page = 0, size = 20): Promise<NotificationPage> => {
    const response = await axiosInstance.get<NotificationPage>("/notifications", {
      params: { page, size },
    });
    return response.data;
  },

  getUnread: async (page = 0, size = 20): Promise<NotificationPage> => {
    const response = await axiosInstance.get<NotificationPage>("/notifications/unread", {
      params: { page, size },
    });
    return response.data;
  },

  getUnreadCount: async (): Promise<number> => {
    const response = await axiosInstance.get<{ count: number }>("/notifications/unread-count");
    return response.data.count;
  },

  markAsRead: async (id: number): Promise<void> => {
    await axiosInstance.put(`/notifications/${id}/read`);
  },

  markAllAsRead: async (): Promise<void> => {
    await axiosInstance.put("/notifications/read-all");
  },
};
