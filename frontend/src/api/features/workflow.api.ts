import axiosInstance from "../axios";

// ---- Types ----

export interface WorkflowTransitionDTO {
  id: number;
  entityName: string;
  entityId: number;
  fromState: string;
  toState: string;
  triggeredBy: number;
  comment: string;
  transitionedAt: string;
}

// ---- API ----

export const workflowApi = {
  getHistory: async (
    entityName: string,
    entityId: number,
  ): Promise<WorkflowTransitionDTO[]> => {
    const response = await axiosInstance.get<WorkflowTransitionDTO[]>(
      `/workflow/history/${entityName}/${entityId}`,
    );
    return response.data;
  },

  getAvailableTransitions: async (currentState: string): Promise<string[]> => {
    const response = await axiosInstance.get<string[]>(
      `/workflow/transitions/${currentState}`,
    );
    return response.data;
  },
};
