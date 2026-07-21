import { useMemo, useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Check, ChevronDown, Search } from "lucide-react";

export interface SearchableSelectOption {
  value: string;
  label: string;
}

interface SearchableSelectProps {
  value?: string;
  onValueChange: (value: string) => void;
  options: SearchableSelectOption[];
  placeholder?: string;
  /** Extra classes for the trigger (e.g. width). */
  className?: string;
  align?: "start" | "center" | "end";
  /** Max options visible before the list scrolls; the rest stay searchable. */
  maxVisible?: number;
  searchPlaceholder?: string;
  disabled?: boolean;
}

/**
 * A Select-like dropdown that always shows a mini search box and caps the
 * visible list to `maxVisible` rows (default 5), scrolling the rest. Drop-in
 * replacement for the shadcn <Select> for long option lists.
 */
export function SearchableSelect({
  value,
  onValueChange,
  options,
  placeholder = "Chọn…",
  className,
  align = "start",
  maxVisible = 5,
  searchPlaceholder = "Tìm kiếm…",
  disabled,
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const selected = options.find((o) => o.value === value);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? options.filter((o) => o.label.toLowerCase().includes(q)) : options;
  }, [options, query]);

  const pick = (v: string) => {
    onValueChange(v);
    setOpen(false);
    setQuery("");
  };

  // ~34px per row — cap the scroll area at `maxVisible` rows.
  const ROW_PX = 34;

  return (
    <Popover open={open} onOpenChange={(o) => { setOpen(o); if (!o) setQuery(""); }}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className={cn(
            "flex h-9 w-full items-center justify-between gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring/40 disabled:cursor-not-allowed disabled:opacity-50",
            className,
          )}
        >
          <span className={cn("truncate", !selected && "text-muted-foreground")}>
            {selected ? selected.label : placeholder}
          </span>
          <ChevronDown className="size-4 shrink-0 opacity-50" />
        </button>
      </PopoverTrigger>

      <PopoverContent
        align={align}
        sideOffset={4}
        className="w-[var(--radix-popover-trigger-width)] overflow-hidden p-0"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        {/* Mini search bar */}
        <div className="flex items-center gap-2 border-b border-border px-2.5">
          <Search className="size-3.5 shrink-0 text-muted-foreground" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && filtered[0]) {
                e.preventDefault();
                pick(filtered[0].value);
              }
            }}
            placeholder={searchPlaceholder}
            className="h-9 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>

        {/* Options (max `maxVisible` rows, then scroll) */}
        <div className="scrollbar-hidden overflow-y-auto p-1" style={{ maxHeight: maxVisible * ROW_PX + 8 }}>
          {filtered.length === 0 ? (
            <p className="px-2 py-3 text-center text-xs text-muted-foreground">Không có kết quả</p>
          ) : (
            filtered.map((o) => (
              <button
                key={o.value}
                type="button"
                onClick={() => pick(o.value)}
                className={cn(
                  "flex w-full items-center justify-between gap-2 rounded-sm px-2 py-1.5 text-left text-sm transition-colors hover:bg-accent",
                  o.value === value && "bg-accent/60 font-medium",
                )}
              >
                <span className="truncate">{o.label}</span>
                {o.value === value && <Check className="size-4 shrink-0 text-primary" />}
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
