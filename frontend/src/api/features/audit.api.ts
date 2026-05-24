import axiosInstance from "../axios";

// ---- Types ----

export interface AuditLogDTO {
  id: number;
  entityName: string;
  entityId: number;
  action: "CREATE" | "READ" | "UPDATE" | "DELETE";
  beforeData: string | null;
  afterData: string | null;
  diff: string | null;
  userId: number;
  userEmail: string;
  ipAddress: string;
  userAgent: string;
  timestamp: string;
  sessionId: string | null;
}

export interface AuditLogPage {
  content: AuditLogDTO[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

// ---- API ----

export const auditLogApi = {
  getAll: async (page = 0, size = 20): Promise<AuditLogPage> => {
    const response = await axiosInstance.get<AuditLogPage>("/audit-logs", {
      params: { page, size },
    });
    return response.data;
  },

  getByEntity: async (
    entityName: string,
    entityId: number,
    page = 0,
    size = 20,
  ): Promise<AuditLogPage> => {
    const response = await axiosInstance.get<AuditLogPage>(
      `/audit-logs/entity/${entityName}/${entityId}`,
      { params: { page, size } },
    );
    return response.data;
  },

  getByUser: async (
    userId: number,
    page = 0,
    size = 20,
  ): Promise<AuditLogPage> => {
    const response = await axiosInstance.get<AuditLogPage>(
      `/audit-logs/user/${userId}`,
      { params: { page, size } },
    );
    return response.data;
  },
};
