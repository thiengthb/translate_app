export interface ImportError {

  rowNumber: number;

  message: string;
}

export interface ImportResult {

  successCount: number;

  failureCount: number;

  /** Dòng bị bỏ qua có chủ đích (vd: từ vựng đã tồn tại). Mặc định 0. */
  skippedCount?: number;

  errors: ImportError[];
}