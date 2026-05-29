import type { BaseDTO, BaseFilter } from "@/types/common/base";

export type FlashcardSideType = "FRONT" | "BACK" | "HINT";
export type FlashcardContentType = "TEXT" | "IMAGE" | "AUDIO" | "VIDEO" | "CLOZE";

export interface FlashcardSideContentDTO {
  id?: number;
  label?: string;
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

/* ─────────────────────────────────────────
   Templates
───────────────────────────────────────── */

export interface FlashcardTemplateDTO extends BaseDTO {
  userId: number | null;
  cardType: string | null;
  name: string;
  description: string | null;
  frontTemplate: string | null;
  backTemplate: string | null;
  styling: string | null;
  builderConfigJson?: string | null;
  isSystem: boolean;
  isDefault: boolean;
}

export interface FlashcardTemplateFilter extends BaseFilter {
  userId?: number;
  cardType?: string;
  isSystem?: boolean;
  isDefault?: boolean;
}

export interface CreateUpdateTemplateRequest {
  name: string;
  cardType: string | null;
  description: string | null;
  frontTemplate: string | null;
  backTemplate: string | null;
  styling: string | null;
  builderConfigJson?: string | null;
  isActive: boolean;
}

export interface FlashcardRenderDTO {
  flashcardId: number;
  frontHtml: string;
  backHtml: string;
  styling: string | null;
  templateId: number | null;
}
