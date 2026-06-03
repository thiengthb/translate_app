// Bảng màu/nhãn JLPT dùng chung giữa trang Từ điển và trang Sổ tay.
// Trích ra file riêng để cả DictionaryPage và NotebookPage cùng dùng,
// tránh định nghĩa trùng.
export const JLPT: Record<string, { badge: string; bar: string; accent: string; text: string }> = {
    N1: { badge: "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30",
          bar: "bg-red-500", accent: "border-l-red-500", text: "text-red-600 dark:text-red-400" },
    N2: { badge: "bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/30",
          bar: "bg-orange-500", accent: "border-l-orange-500", text: "text-orange-600 dark:text-orange-400" },
    N3: { badge: "bg-yellow-500/15 text-yellow-700 dark:text-yellow-400 border-yellow-500/30",
          bar: "bg-yellow-500", accent: "border-l-yellow-500", text: "text-yellow-700 dark:text-yellow-400" },
    N4: { badge: "bg-green-500/15 text-green-600 dark:text-green-400 border-green-500/30",
          bar: "bg-green-500", accent: "border-l-green-500", text: "text-green-600 dark:text-green-400" },
    N5: { badge: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30",
          bar: "bg-blue-500", accent: "border-l-blue-500", text: "text-blue-600 dark:text-blue-400" },
};