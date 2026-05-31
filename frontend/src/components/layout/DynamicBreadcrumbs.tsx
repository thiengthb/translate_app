import { useMemo } from "react";
import { Link, useLocation } from "react-router-dom";
import { ChevronRight, Home } from "lucide-react";

import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from "@/components/ui/breadcrumb.tsx";
import { iconMap } from "@/components/datatable/iconMap";
import { InfoLabel } from "@/components/common/InfoLabel";
import { TooltipWrapper } from "@/components/datatable/common/TooltipWrapper";
import { useActiveModuleGroups } from "@/hooks/useSidebarMenus.ts";
import { cn } from "@/lib/utils";

const MAX_CRUMB_LEN = 15;

function truncateCrumb(text: string): { display: string; full: string; truncated: boolean } {
    if (text.length <= MAX_CRUMB_LEN) return { display: text, full: text, truncated: false };
    return { display: text.slice(0, MAX_CRUMB_LEN) + "…", full: text, truncated: true };
}

type Props = {
    pathTitles?: Record<string, string>;
    hasPage?: boolean;
    ignorePaths?: string[];
    parentCrumb?: { href: string; title: string };
    /** Override the ⓘ tooltip description for the last (current) segment. */
    pageDescription?: string;
};

function formatPath(path: string) {
    return path
        .replace(/-/g, " ")
        .replace(/_/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase());
}

const PAGE_DESCRIPTIONS: Record<string, string> = {
    "/profile": "Your account profile and personal details.",
    "/settings": "Personalize theme, color, typography and language.",
    "/help/shortcuts": "All keyboard shortcuts available across the app.",
    "/student": "Learning area for students.",
    "/teacher": "Workspace for teachers.",
    "/library": "Bộ sưu tập deck học tập của bạn.",
    "/community": "Duyệt và lưu các deck công khai được chia sẻ bởi cộng đồng.",
    "/create-deck": "Pick a study mode and create a new deck.",
    "/create-deck/quizlet": "Create a fast flip-card (Quizlet) deck.",
    "/create-deck/anki": "Create a spaced-repetition (Anki) deck.",
    "/analyze": "Break down the grammar of a Japanese sentence.",
    "/production": "Practice composing Japanese sentences.",
    "/notifications": "Your notification inbox.",
    "/words/create":
        "Thêm từ vựng kèm nhiều nghĩa (đa ngôn ngữ) và ví dụ — tất cả trong một lần.",
};

export default function DynamicBreadcrumbs({
    pathTitles,
    hasPage = true,
    ignorePaths = [],
    parentCrumb,
    pageDescription,
}: Props) {
    const location = useLocation();
    const { data: moduleGroups } = useActiveModuleGroups();

    const ignoreSet = useMemo(
        () => new Set(ignorePaths.map((p) => p.toLowerCase())),
        [ignorePaths],
    );

    /**
     * Build (segment, href) pairs from the real pathname. Ignored segments are
     * skipped for display but the href for each kept segment still reflects the
     * full original path up to that point — so "/deck/123/anki" with
     * ignorePaths=["deck","123"] gives [{ segment:"anki", href:"/deck/123/anki" }].
     */
    const segmentPairs = useMemo(() => {
        const all = location.pathname.split("/").filter(Boolean);
        const result: { segment: string; href: string }[] = [];
        all.forEach((seg, idx) => {
            if (!ignoreSet.has(seg.toLowerCase())) {
                result.push({
                    segment: seg,
                    href: "/" + all.slice(0, idx + 1).join("/"),
                });
            }
        });
        return result;
    }, [location.pathname, ignoreSet]);

    const activeModule = useMemo(
        () =>
            moduleGroups
                ?.flatMap((g) => g.modules)
                ?.find((m) => m.url === location.pathname),
        [moduleGroups, location.pathname],
    );

    const ModuleIcon = useMemo(() => {
        const key =
            activeModule?.icon && activeModule.icon in iconMap
                ? (activeModule.icon as keyof typeof iconMap)
                : null;
        return key ? iconMap[key] : null;
    }, [activeModule]);

    const isEmpty = segmentPairs.length === 0 && !parentCrumb;

    if (isEmpty) {
        return (
            <Breadcrumb>
                <BreadcrumbList className="text-[15px] gap-2">
                    <BreadcrumbItem>
                        <HomeLink />
                    </BreadcrumbItem>
                </BreadcrumbList>
            </Breadcrumb>
        );
    }

    return (
        <Breadcrumb>
            <BreadcrumbList className="text-[15px] gap-2 flex-nowrap">
                <BreadcrumbItem>
                    <HomeLink />
                </BreadcrumbItem>

                {/* Optional explicit parent (e.g. "My Library" → /library) */}
                {parentCrumb && (
                    <BreadcrumbItem className="flex items-center gap-2">
                        <BreadcrumbSeparator className="text-muted-foreground/50">
                            <ChevronRight className="size-4" />
                        </BreadcrumbSeparator>
                        <BreadcrumbLink asChild>
                            {(() => {
                                const { display, full, truncated } = truncateCrumb(parentCrumb.title);
                                const link = (
                                    <Link
                                        to={parentCrumb.href}
                                        className={cn(
                                            "px-2 py-1 rounded-md text-muted-foreground",
                                            "hover:text-foreground hover:bg-accent/70 transition-colors",
                                        )}
                                    >
                                        {display}
                                    </Link>
                                );
                                return truncated
                                    ? <TooltipWrapper content={full} side="bottom">{link}</TooltipWrapper>
                                    : link;
                            })()}
                        </BreadcrumbLink>
                    </BreadcrumbItem>
                )}

                {segmentPairs.map(({ segment, href }, index) => {
                    const isLast = index === segmentPairs.length - 1;
                    const title =
                        pathTitles?.[href] ??
                        pathTitles?.[segment] ??
                        (isLast ? activeModule?.title : undefined) ??
                        formatPath(segment);
                    const { display, full, truncated } = truncateCrumb(title);

                    // Description backs the ⓘ tooltip on the current page
                    // crumb. Resolve it once; when none exists we skip the
                    // InfoLabel entirely so no empty ⓘ is shown.
                    const description = isLast
                        ? pageDescription ??
                          activeModule?.description ??
                          PAGE_DESCRIPTIONS[href]
                        : undefined;
                    const hasDescription =
                        !!description && description.trim().length > 0;

                    return (
                        <BreadcrumbItem
                            key={href}
                            className="flex items-center gap-2"
                        >
                            <BreadcrumbSeparator className="text-muted-foreground/50">
                                <ChevronRight className="size-4" />
                            </BreadcrumbSeparator>

                            {isLast && hasPage ? (
                                <span className="flex items-center gap-2 px-2 py-1 rounded-md">
                                    {ModuleIcon && (
                                        <ModuleIcon
                                            className="size-[18px] text-primary shrink-0"
                                            aria-hidden
                                        />
                                    )}
                                    {(() => {
                                        // Only wrap in a tooltip when the title
                                        // is actually truncated; only attach the
                                        // ⓘ InfoLabel when a description exists.
                                        const page = (
                                            <BreadcrumbPage className="text-foreground font-medium">
                                                {display}
                                            </BreadcrumbPage>
                                        );
                                        const titled = truncated ? (
                                            <TooltipWrapper content={full} side="bottom">
                                                {page}
                                            </TooltipWrapper>
                                        ) : (
                                            page
                                        );
                                        return hasDescription ? (
                                            <InfoLabel
                                                title={titled}
                                                info={description}
                                                side="bottom"
                                            />
                                        ) : (
                                            titled
                                        );
                                    })()}
                                </span>
                            ) : (
                                <BreadcrumbLink asChild>
                                    {(() => {
                                        const link = (
                                            <Link
                                                to={href}
                                                className={cn(
                                                    "px-2 py-1 rounded-md text-muted-foreground",
                                                    "hover:text-foreground hover:bg-accent/70 transition-colors",
                                                )}
                                            >
                                                {display}
                                            </Link>
                                        );
                                        return truncated
                                            ? <TooltipWrapper content={full} side="bottom">{link}</TooltipWrapper>
                                            : link;
                                    })()}
                                </BreadcrumbLink>
                            )}
                        </BreadcrumbItem>
                    );
                })}
            </BreadcrumbList>
        </Breadcrumb>
    );
}

function HomeLink() {
    return (
        <BreadcrumbLink asChild>
            <Link
                to="/"
                aria-label="Trang chủ"
                className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-accent/70 transition-colors"
            >
                <Home className="size-[18px]" />
            </Link>
        </BreadcrumbLink>
    );
}
