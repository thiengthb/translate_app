import { TooltipWrapper } from "@/components/datatable/common/TooltipWrapper";
import { Input } from "@/components/ui/input";
import { Loader2, Search, X } from "lucide-react";

interface SearchInputProps {
    search: string;
    onSearchChange: (value: string) => void;
    isPending?: boolean;
}

export function SearchInput({ search, onSearchChange, isPending }: SearchInputProps) {
    return (
        <div className="relative w-full max-w-full sm:max-w-xl">
            <Search
                size={16}
                className="absolute text-muted-foreground top-1/2 -translate-y-1/2 left-2"
            />
            <Input
                placeholder="Tìm kiếm..."
                className="pl-8 pr-9 w-full h-9"
                value={search || ""}
                onChange={(e) => onSearchChange(e.target.value)}
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                {isPending && search && (
                    <Loader2
                        size={13}
                        className="animate-spin text-muted-foreground"
                        aria-label="Đang tìm..."
                    />
                )}
                {search && (
                    <TooltipWrapper content="Xóa tìm kiếm">
                        <button
                            type="button"
                            onClick={() => onSearchChange("")}
                            className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                            aria-label="Clear search"
                        >
                            <X size={14} />
                        </button>
                    </TooltipWrapper>
                )}
            </div>
        </div>
    );
}
