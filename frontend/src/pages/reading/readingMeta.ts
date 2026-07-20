import { Coffee, Leaf, Scale, FlaskConical, Palette, HeartPulse, Tag, type LucideIcon } from "lucide-react";
import { JLPT } from "@/pages/dictionary/dictionaryConstants";

/** Số liệu suy ra từ nội dung bài đọc — dùng để hiển thị chỉ số ở list & detail. */
export function passageStats(content: string | null | undefined) {
    const text = content ?? "";
    const chars = Array.from(text.replace(/\s/g, "")).length;
    const sentences = text.split(/[。．！？!?\n]/).map((s) => s.trim()).filter(Boolean).length;
    // ~300 ký tự/phút cho người học — làm tròn lên, tối thiểu 1 phút.
    const minutes = Math.max(1, Math.round(chars / 300));
    return { chars, sentences, minutes };
}

/** Bộ màu JLPT cho level chuỗi ("N5"…); null nếu không khớp. */
export function levelStyle(level?: string | null) {
    return level && JLPT[level] ? JLPT[level] : null;
}

/**
 * Chủ đề bài đọc kiểu chuyên mục báo. Key = nhãn tiếng Việt lưu thẳng ở
 * cột {@code category} (khớp enumValues của entity ReadingPassage). Mỗi chủ đề
 * có icon (lucide), màu badge và viền trái thẻ — theo cùng pattern bộ màu JLPT.
 */
export interface ReadingCategory {
    key: string;
    icon: LucideIcon;
    /** Nền + chữ + viền cho badge/ô icon. */
    badge: string;
    /** Viền trái thẻ (border-l-*). */
    accent: string;
    /** Nền đặc (bg-*) cho dải màu/chip active. */
    bar: string;
    /** Màu chữ (text-*) cho nhãn chuyên mục. */
    text: string;
    /** Cặp màu gradient (from-* to-*) cho ảnh fallback khi bài không có hình. */
    gradient: string;
}

export const READING_CATEGORIES: ReadingCategory[] = [
    { key: "Đời sống",              icon: Coffee,       badge: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30",       accent: "border-l-amber-500",   bar: "bg-amber-500",   text: "text-amber-600 dark:text-amber-400",     gradient: "from-amber-400 to-orange-500" },
    { key: "Tự nhiên & Môi trường", icon: Leaf,         badge: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30", accent: "border-l-emerald-500", bar: "bg-emerald-500", text: "text-emerald-600 dark:text-emerald-400", gradient: "from-emerald-400 to-teal-500" },
    { key: "Xã hội & Pháp luật",    icon: Scale,        badge: "bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/30",               accent: "border-l-sky-500",     bar: "bg-sky-500",     text: "text-sky-600 dark:text-sky-400",         gradient: "from-sky-400 to-blue-500" },
    { key: "Khoa học & Công nghệ",  icon: FlaskConical, badge: "bg-violet-500/15 text-violet-600 dark:text-violet-400 border-violet-500/30",   accent: "border-l-violet-500",  bar: "bg-violet-500",  text: "text-violet-600 dark:text-violet-400",   gradient: "from-violet-400 to-purple-500" },
    { key: "Văn hóa",               icon: Palette,      badge: "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30",           accent: "border-l-rose-500",    bar: "bg-rose-500",    text: "text-rose-600 dark:text-rose-400",       gradient: "from-rose-400 to-pink-500" },
    { key: "Sức khỏe",              icon: HeartPulse,   badge: "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30",               accent: "border-l-red-500",     bar: "bg-red-500",     text: "text-red-600 dark:text-red-400",         gradient: "from-red-400 to-rose-500" },
];

/** Chủ đề giả cho bài chưa gán category (hoặc category không khớp danh sách). */
export const UNCATEGORIZED: ReadingCategory = {
    key: "Chưa phân loại",
    icon: Tag,
    badge: "bg-slate-500/15 text-slate-600 dark:text-slate-400 border-slate-500/30",
    accent: "border-l-slate-400",
    bar: "bg-slate-400",
    text: "text-slate-500 dark:text-slate-400",
    gradient: "from-slate-300 to-slate-400",
};

/** Style + icon của một chủ đề (theo nhãn lưu ở DB); null nếu không khớp. */
export function categoryStyle(category?: string | null): ReadingCategory | null {
    return READING_CATEGORIES.find((c) => c.key === category) ?? null;
}

/** Như {@link categoryStyle} nhưng luôn trả về một chủ đề — fallback "Chưa phân loại". */
export function categoryOf(category?: string | null): ReadingCategory {
    return categoryStyle(category) ?? UNCATEGORIZED;
}

/** Đoạn trích tiếng Nhật một dòng để xem trước trên thẻ. */
export function previewLine(content: string | null | undefined, max = 70) {
    const first = (content ?? "").split(/\r?\n/).map((l) => l.trim()).find(Boolean) ?? "";
    return first.length > max ? `${first.slice(0, max)}…` : first;
}