import { SlidersHorizontal } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export interface LibrarySortOption<T extends string> {
  value: T;
  label: string;
}

/**
 * Sort ("filter") menu shared by both My Library tabs (decks + templates).
 *
 * Icon-only trigger that matches the ProTable toolbar buttons; the active
 * option is marked by the radio indicator. Pure UI — the parent owns the
 * sort state and comparator.
 */
export function LibrarySortMenu<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: LibrarySortOption<T>[];
  onChange: (value: T) => void;
}) {
  const active = options.find((o) => o.value === value) ?? options[0];
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          title="Sắp xếp"
          aria-label="Sắp xếp"
          className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-border bg-background px-3 text-sm font-medium text-foreground transition-colors hover:bg-accent data-[state=open]:bg-accent data-[state=open]:ring-2 data-[state=open]:ring-ring/50"
        >
          <SlidersHorizontal className="size-3.5 text-muted-foreground" />
          <span>{active?.label}</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuLabel className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Sắp xếp theo
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuRadioGroup value={value} onValueChange={(v) => onChange(v as T)}>
          {options.map((o) => (
            <DropdownMenuRadioItem key={o.value} value={o.value} className="text-sm">
              {o.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
