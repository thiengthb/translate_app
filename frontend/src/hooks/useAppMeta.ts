import { useEffect, useMemo } from "react";
import { useLocation } from "react-router-dom";

import { useActiveModuleGroups } from "@/hooks/useSidebarMenus";

/**
 * Brand name appended to every dynamic title. Lives here (not as a
 * runtime constant) so a future rebrand only touches this file.
 */
const BRAND_NAME = "Gengo";

/**
 * Title separator. `·` (interpunct U+00B7) is the modern choice — visually
 * lighter than a hyphen, more elegant than a pipe.
 */
const SEPARATOR = " · ";

/**
 * Static route → display title. The BE's Module table is the source of
 * truth for module-driven URLs (`/users`, `/dashboard`, etc.). This
 * table covers the rest — auth flows, profile, settings, error pages —
 * routes the BE doesn't know about.
 *
 * Ordered roughly by likelihood so the runtime lookup short-circuits
 * on the common paths first.
 */
const STATIC_TITLES: Array<[path: string, title: string]> = [
    // Personal pages
    ["/profile", "Hồ sơ"],
    ["/settings", "Cài đặt"],
    ["/streak", "Chuỗi học tập"],
    ["/leaderboard", "Bảng xếp hạng"],
    ["/notifications", "Thông báo"],
    ["/audit-logs", "Audit log"],

    // Help & support
    ["/help/shortcuts", "Phím tắt"],

    // Role landing pages
    ["/student", "Khu vực học sinh"],
    ["/teacher", "Khu vực giáo viên"],
    ["/dashboard", "Dashboard"],

    // Auth flows
    ["/login", "Đăng nhập"],
    ["/register", "Đăng ký"],
    ["/forgot-password", "Quên mật khẩu"],
    ["/check-email", "Xác nhận email"],
    ["/oauth2/redirect", "Đang đăng nhập…"],
    ["/logout", "Đăng xuất"],

    // Error pages
    ["/not-found-page", "Không tìm thấy"],
    ["/unauthorized", "Không có quyền"],

    // Root — brand only, no prefix
    ["/", ""],
];

/**
 * Resolve a page label for a given pathname. Returns the page-specific
 * label (e.g. "Người dùng") — the caller prepends/separator-joins the
 * brand. Returns `null` when nothing matches so the caller can fall
 * back to the bare brand name.
 *
 * Resolution order:
 *   1. Exact match against a BE module URL
 *   2. Exact match against the static table above
 *   3. Prefix match (longest-first) against the same two sources —
 *      so `/users/42` inherits the `/users` label
 *
 * Sorting prefix candidates by length descending matters: `/users/profile`
 * must match `/users/profile` before `/users` when both exist.
 */
function resolveTitle(
    pathname: string,
    moduleEntries: Array<[string, string]>,
): string | null {
    // 1. Exact module match
    for (const [url, title] of moduleEntries) {
        if (url === pathname) return title;
    }
    // 2. Exact static match
    for (const [path, title] of STATIC_TITLES) {
        if (path === pathname) return title || null;
    }
    // 3. Prefix match — longest path first
    const all = [...moduleEntries, ...STATIC_TITLES].filter(
        ([url]) => !!url && url !== "/",
    );
    all.sort((a, b) => b[0].length - a[0].length);
    for (const [path, title] of all) {
        // `path + "/"` so `/user` doesn't accidentally match `/users`
        if (pathname.startsWith(path + "/")) return title || null;
    }
    return null;
}

/**
 * Keep `document.title` in sync with the active route.
 *
 *   "/users"            → "Người dùng · Gengo"
 *   "/users/42"         → "Người dùng · Gengo"   (prefix inheritance)
 *   "/settings"         → "Cài đặt · Gengo"
 *   "/"                 → "Gengo"                (root: brand only)
 *   (unknown)           → "Gengo"
 *
 * Mounted at the App level (inside BrowserRouter so `useLocation`
 * works) so every navigation — programmatic, link click, browser
 * back/forward — triggers a title update without any per-page wiring.
 */
export function useAppMeta(): void {
    const location = useLocation();
    const { data: moduleGroups = [] } = useActiveModuleGroups();

    // Flatten BE modules to a [url, title] tuple list once per change.
    // Stable identity matters here because `resolveTitle` does an
    // `Array.sort` per lookup; we don't want to do that on every render.
    const moduleEntries = useMemo<Array<[string, string]>>(() => {
        const list: Array<[string, string]> = [];
        for (const group of moduleGroups) {
            for (const m of group.modules ?? []) {
                if (m.url && m.title) list.push([m.url, m.title]);
            }
        }
        return list;
    }, [moduleGroups]);

    useEffect(() => {
        const label = resolveTitle(location.pathname, moduleEntries);
        document.title = label ? `${label}${SEPARATOR}${BRAND_NAME}` : BRAND_NAME;
    }, [location.pathname, moduleEntries]);
}
