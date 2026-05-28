import type { BaseDTO, BaseFilter } from "@/types/common/base";

export type FlashcardSideType = "FRONT" | "BACK" | "HINT";
export type FlashcardContentType = "TEXT" | "IMAGE" | "AUDIO" | "VIDEO" | "CLOZE";

export interface FlashcardSideContentDTO {
  id?: number;
  contentType: FlashcardContentType;
  contentValue: string;
  orderIndex: number;
  metadata?: Record<string, unknown>;
}

export interface FlashcardSideDTO {
  id?: number;
  side: FlashcardSideType;
  contents?: FlashcardSideContentDTO[];
}

export interface FlashcardDTO extends BaseDTO {
  itemId?: number;
  itemType?: string;
  wordId?: number;
  cardType?: string;
  hint?: string;
  explanation?: string;
  sides?: FlashcardSideDTO[];
  /** Legacy fields kept for backward compatibility with older callers / responses. */
  front?: string;
  back?: string;
  imageUrl?: string;
  audioUrl?: string;
}

export interface FlashcardFilter extends BaseFilter {
  wordId?: number;
  cardType?: string;
  itemType?: string;
  front?: string;
}
