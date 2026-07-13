import {
    Command,
    LayoutDashboard,
    PanelLeftClose,
    Settings2,
    Table2,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

/**
 * Detect Mac so we can show ⌘ for Cmd-style shortcuts (and Ctrl on
 * Win/Linux). Static — keyboard rarely changes mid-session.
 */
export const IS_MAC =
    typeof window !== "undefined" &&
    /Mac|iPhone|iPad|iPod/i.test(window.navigator.platform);

/** "⌘" on Mac, "Ctrl" elsewhere. */
export const MOD_KEY: string = IS_MAC ? "⌘" : "Ctrl";

export interface Shortcut {
    label: string;
    /** Keys to display, each one rendered as a separate <Kbd>. */
    keys: string[];
    /** Optional longer explanation surfaced on the docs page. */
    description?: string;
}

export interface ShortcutGroup {
    id: string;
    title: string;
    icon: LucideIcon;
    /** Short blurb shown under the group title on the docs page. */
    description?: string;
    items: Shortcut[];
}

/**
 * Single source of truth for documented keyboard shortcuts. Both the
 * quick-reference dialog and the full docs page read from this list, so
 * adding a new shortcut means editing exactly one file.
 */
export const SHORTCUT_GROUPS: ShortcutGroup[] = [
    {
        id: "general",
        title: "Tổng quát",
        icon: Command,
        description:
            "Phím tắt hoạt động ở mọi trang trong ứng dụng, kể cả khi không có sidebar.",
        items: [
            {
                label: "Mở danh sách phím tắt",
                keys: ["?"],
                description:
                    "Bấm Shift + / ở bất kỳ đâu (trừ khi đang nhập text) để mở popup phím tắt.",
            },
            {
                label: "Đóng modal / popover đang mở",
                keys: ["Esc"],
            },
            {
                label: "Đăng xuất",
                keys: [MOD_KEY, "Shift", "L"],
                description:
                    "Đăng xuất khỏi tài khoản và chuyển về trang đăng nhập. Hiển thị toast trước khi rời trang để báo hiệu cho người dùng.",
            },
        ],
    },
    {
        id: "sidebar",
        title: "Sidebar",
        icon: PanelLeftClose,
        description: "Ẩn / hiện sidebar nhanh.",
        items: [
            {
                label: "Đóng / mở sidebar",
                keys: [MOD_KEY, "B"],
                description:
                    "Toggle giữa trạng thái mở rộng và icon-only của sidebar. Trạng thái được lưu cookie nên load lại trang giữ nguyên.",
            },
        ],
    },
    {
        id: "table",
        title: "Bảng dữ liệu (ProTable)",
        icon: Table2,
        description:
            "Điều hướng dòng, chọn, tạo và làm mới bảng dữ liệu mà không cần chuột.",
        items: [
            {
                label: "Di chuyển dòng đang focus",
                keys: ["↑", "↓"],
            },
            {
                label: "Xem chi tiết dòng đang focus",
                keys: ["Enter"],
            },
            {
                label: "Xóa dòng đang focus",
                keys: ["Delete"],
                description: "Mở hộp thoại xác nhận xóa.",
            },
            {
                label: "Chọn / bỏ chọn dòng đang focus",
                keys: ["Space"],
                description: "Toggle checkbox ở cột Select của dòng đang focus.",
            },
            {
                label: "Tạo mới",
                keys: ["N"],
                description: "Mở form tạo entity mới (nếu có quyền).",
            },
            {
                label: "Làm mới dữ liệu",
                keys: ["R"],
                description: "Gọi refetch — tải lại data từ server.",
            },
            {
                label: "Focus thanh tìm kiếm bảng",
                keys: ["/"],
                description:
                    "Convention quen thuộc của GitHub / Vercel / Linear. `Ctrl/⌘+F` cũng hoạt động.",
            },
            {
                label: "Chọn tất cả dòng trên trang",
                keys: [MOD_KEY, "A"],
            },
            {
                label: "In bảng",
                keys: [MOD_KEY, "P"],
                description:
                    "Sử dụng print dialog của browser. Trên màn in, các cột tự động bỏ pin và in trọn vẹn.",
            },
            {
                label: "Hủy / bỏ chọn",
                keys: ["Esc"],
            },
        ],
    },
    {
        id: "tips",
        title: "Lưu ý",
        icon: Settings2,
        description: "Một số quy tắc chung khi dùng phím tắt.",
        items: [
            {
                label: "Phím chữ đơn (N, R, /, ?)",
                keys: [],
                description:
                    "Chỉ hoạt động khi con trỏ KHÔNG nằm trong input / textarea / contenteditable. Đang gõ trong form thì ký tự sẽ hiển thị bình thường.",
            },
            {
                label: "Phím tắt OS / browser được ưu tiên",
                keys: [],
                description:
                    "Ctrl/⌘ kết hợp với phím khác do hệ điều hành quản lý sẽ không bị app chiếm — ví dụ Ctrl+T, Ctrl+W vẫn hoạt động như thường.",
            },
        ],
    },
];

/** Convenience lookup for icons by group id (used in dashboard tiles, etc.). */
export const SHORTCUT_GROUP_ICONS: Record<string, LucideIcon> = {
    general: Command,
    sidebar: PanelLeftClose,
    table: Table2,
    tips: Settings2,
    dashboard: LayoutDashboard,
};
