import axiosInstance from "@/api/axios";

export interface RewardLog {
  id: number;
  sourceType: string;
  sourceId: number;
  expGranted: number;
  coinsGranted: number;
  description?: string | null;
  createdAt?: string;
}

export interface RewardBalance {
  exp: number;
  coins: number;
  level: number;        // provided by backend — do NOT compute client-side
  expToNext: number;    // EXP needed to reach next level, 0 if max level
  activeTitleId: number | null;
  history: RewardLog[];
}

export const rewardApi = {
  /** Current user's exp/coins/level balance and reward history. */
  getMe: async (): Promise<RewardBalance> => {
    const res = await axiosInstance.get<RewardBalance>("/rewards/me");
    return res.data;
  },
};
