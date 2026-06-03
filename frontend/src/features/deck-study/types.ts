import type { FlashcardDTO } from "@/types";
import type { QuizletProgressDTO, StudyMode } from "@/api";

export type { StudyMode };

/** One studyable card: a deck item joined to its flashcard content. */
export interface StudyCard {
  deckItemId: number;
  orderIndex: number;
  flashcard: FlashcardDTO;
}

/** Visible side a mode prompts from / answers with. */
export type StudySide = "FRONT" | "BACK";

/** Props shared by the non-SRS mode components rendered inside the study shell. */
export interface StudyModeProps {
  deckId: number;
  cards: StudyCard[];
  fullView: boolean;
  /** Toggle the immersive full-view overlay (the zoom button lives on the card). */
  onToggleFullView: () => void;
  /** Saved Quizlet progress keyed by flashcardId — lets a mode resume from the backend. */
  progress?: Map<number, QuizletProgressDTO>;
  /**
   * Report the flashcard currently shown so the shell's edit menu can offer
   * "Sửa thẻ hiện tại". Pass null when the mode has no single current card.
   */
  onCurrentCard?: (flashcardId: number | null) => void;
}
