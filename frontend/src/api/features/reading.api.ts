import { createBaseApiService } from "@/api/base-service.api";

/** Bài đọc hiểu (entity ReadingPassage, auto-CRUD ở /api/reading-passages). */
export interface ReadingPassage {
    id: number;
    title: string;
    content: string;
    level?: string | null;
    category?: string | null;
    summary?: string | null;
    imageUrl?: string | null;
    sortOrder?: number | null;
    isActive?: boolean;
}

// CRUD chuẩn (getPage / getById …). Admin quản lý qua ProTable tự sinh; các trang
// học viên (/reader, /reader/:id) chỉ dùng getPage + getById.
export const readingApi = createBaseApiService<ReadingPassage>({
    path: "/reading-passages",
});