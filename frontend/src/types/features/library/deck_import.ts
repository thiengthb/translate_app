export type DeckImportDelimiter = "AUTO" | "COMMA" | "TAB" | "SEMICOLON" | "PIPE";

export type DeckImportPreviewLimit = 10 | 20 | 50 | 100;

export type DeckImportTargetField =
  | "IGNORE"
  | "FRONT"
  | "BACK"
  | "READING"
  | "ROMAJI"
  | "ONYOMI"
  | "KUNYOMI"
  | "EXAMPLE"
  | "EXAMPLE_TRANSLATION"
  | "NOTE"
  | "TAGS";

export type DeckImportDuplicateStrategy = "SKIP" | "UPDATE" | "CREATE_NEW";

export interface DeckImportColumnPreview {
  key: string;
  label: string;
  index: number;
  suggestedField: DeckImportTargetField;
  samples: string[];
}

export interface DeckImportRowPreview {
  rowNumber: number;
  values: Record<string, string>;
  warnings: string[];
}

export interface DeckImportPreviewResponse {
  token: string;
  fileName: string;
  delimiter: string;
  headerDetected: boolean;
  totalRows: number;
  previewPage: number;
  previewRows: number;
  totalPages: number;
  columnCount: number;
  columns: DeckImportColumnPreview[];
  rows: DeckImportRowPreview[];
  suggestedMapping: Record<string, DeckImportTargetField>;
  warnings: string[];
}

export interface DeckImportDeckTarget {
  title?: string;
  description?: string;
  folderId?: number;
  visibility?: string;
  deckIcon?: string;
  deckColor?: string;
  sourceLanguage?: string;
  targetLanguage?: string;
}

export interface DeckImportConfirmRequest {
  token: string;
  deckId?: number;
  deck?: DeckImportDeckTarget;
  duplicateStrategy?: DeckImportDuplicateStrategy;
  mapping: Record<string, DeckImportTargetField>;
}

export type DeckImportBatchStatus = "RUNNING" | "COMPLETED" | "FAILED";

export interface DeckImportRowError {
  rowNumber: number;
  message: string;
  rawData: Record<string, unknown>;
}

export interface DeckImportResultResponse {
  batchId: number;
  deckId: number;
  deckTitle: string;
  status: DeckImportBatchStatus;
  totalRows: number;
  createdRows: number;
  updatedRows: number;
  skippedRows: number;
  failedRows: number;
  duplicateRows: number;
  errors: DeckImportRowError[];
}
