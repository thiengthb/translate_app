import { Search, X } from "lucide-react";
import { useRef } from "react";

import { Input } from "@/components/ui/input";
import { useSidebar } from "@/components/ui/sidebar";

interface SidebarSearchProps {
    value: string;
    onChange: (next: string) => void;
    /** Optional icon-buttons rendered to the right of the search field
     *  (e.g. expand-all / collapse-all). Hidden along with the input when
     *  the sidebar is collapsed. */
    actions?: React.ReactNode;
}

/**
 * Inline filter input shown only when the sidebar is expanded. Escape
 * clears + blurs.
 *
 * Note: the `/` global shortcut now focuses the table search (see
 * `useTableKeyboard`) — sidebar filter is reached by clicking the
 * field directly.
 */
export function SidebarSearch({ value, onChange, actions }: SidebarSearchProps) {
    const { state } = useSidebar();
    const inputRef = useRef<HTMLInputElement>(null);

    if (state !== "expanded") return null;

    return (
        <div className="px-2 pt-1 pb-2 flex items-center gap-1">
            <div className="relative flex-1 min-w-0">
                <Search
                    size={14}
                    className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
                />
                <Input
                    ref={inputRef}
                    type="text"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === "Escape") {
                            onChange("");
                            (e.target as HTMLInputElement).blur();
                        }
                    }}
                    placeholder="Tìm trong menu…"
                    className="h-8 pl-8 pr-7 text-xs bg-sidebar-accent/40 border-transparent focus-visible:border-input"
                />
                {value && (
                    <button
                        type="button"
                        onClick={() => onChange("")}
                        aria-label="Clear search"
                        className="absolute right-1.5 top-1/2 -translate-y-1/2 p-0.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                    >
                        <X size={12} />
                    </button>
                )}
            </div>
            {actions}
        </div>
    );
}
