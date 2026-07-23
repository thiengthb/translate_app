import axiosInstance from "@/api/axios";

/** One card's before→after change in a reschedule preview/run. */
export interface RescheduleChange {
  flashcardId?: number;
  oldState: string;
  newState: string;
  oldIntervalDays?: number;
  newIntervalDays?: number;
  oldDue?: string;
  newDue?: string;
  stability?: number;
  difficulty?: number;
  /** "HISTORY" (rebuilt from review logs) or "ESTIMATED" (seeded from interval). */
  source: string;
}

/** Result of POST /anki/fsrs/reschedule (mirrors RescheduleResultDTO). */
export interface RescheduleResult {
  dryRun: boolean;
  algorithmType: string;
  totalCards: number;
  rescheduled: number;
  fromHistory: number;
  estimated: number;
  skipped: number;
  dueEarlier: number;
  dueLater: number;
  avgIntervalBefore: number;
  avgIntervalAfter: number;
  samples: RescheduleChange[];
}

export const ankiFsrsApi = {
  /**
   * Rebuild a deck's FSRS schedule from review-log history.
   * @param dryRun true → preview only (nothing saved); false → apply.
   */
  reschedule: async (deckId: number, dryRun: boolean): Promise<RescheduleResult> => {
    const res = await axiosInstance.post<RescheduleResult>(
      `/anki/fsrs/reschedule/${deckId}?dryRun=${dryRun}`,
    );
    return res.data;
  },
};
