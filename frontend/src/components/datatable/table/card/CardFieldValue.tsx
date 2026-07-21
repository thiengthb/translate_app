import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { TruncatedText } from "@/components/datatable/common/TruncatedText";
import { BadgeList } from "@/components/datatable/common/BadgeList";
import { TooltipWrapper } from "@/components/datatable/common/TooltipWrapper";
import { iconMap } from "@/components/datatable/iconMap";
import { cn } from "@/lib/utils";
import type { FieldSchema } from "@/types";

interface CardFieldValueProps {
  field: FieldSchema;
  value: any;
  relationOptions: Record<string, any[]>;
  onBooleanToggle?: (fieldName: string, newValue: boolean) => void;
  disableBooleanToggle?: boolean;
}

const MAX_CARD_BADGES = 3;

export function CardFieldValue({
  field,
  value,
  relationOptions,
  onBooleanToggle,
  disableBooleanToggle = false,
}: CardFieldValueProps) {
  if (field.type === "image") {
    const url =
      value === null || value === undefined || value === ""
        ? null
        : String(value).trim() || null;
    if (!url) return <span className="text-xs text-muted-foreground">—</span>;
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex h-14 w-14 overflow-hidden rounded-md border bg-muted hover:ring-2 hover:ring-primary/40 transition"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={url}
          alt={field.label}
          loading="lazy"
          className="h-full w-full object-cover"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.display = "none";
          }}
        />
      </a>
    );
  }

  if (field.type === "boolean") {
    const labels = field.booleanLabels || { true: "Có", false: "Không" };
    const label = value ? labels.true : labels.false;

    // When the toggle isn't actionable (catalog viewers, locked views),
    // a Switch is misleading — it looks tappable but does nothing.
    // Render as a Badge instead so the state reads as a *fact*, not an
    // *affordance*. Matches the convention used in DetailModal.
    const isInert = disableBooleanToggle || !onBooleanToggle;
    if (isInert) {
      const colorClass = value
        ? labels.trueColor || "bg-emerald-500 text-white border-transparent"
        : labels.falseColor || "bg-slate-400 text-white border-transparent";
      return (
        <Badge
          className={cn(
            "text-[10px] font-medium px-2 py-0.5 rounded-full",
            colorClass,
          )}
        >
          {label}
        </Badge>
      );
    }

    return (
      <div className="flex items-center gap-2">
        <Switch
          checked={!!value}
          onCheckedChange={(checked) => onBooleanToggle?.(field.name, checked)}
          className="data-[state=checked]:bg-primary data-[state=unchecked]:bg-primary/40 scale-90"
        />
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
    );
  }

  if (field.type === "icon" || field.name === "icon") {
    const iconKey = value?.toString();
    const Icon =
      iconKey && iconKey in iconMap
        ? iconMap[iconKey as keyof typeof iconMap]
        : null;

    return (
      <>
        {Icon ? (
          <TooltipWrapper content={iconKey || "—"}>
            <span className="inline-flex items-center">
              <Icon className="h-4 w-4 text-muted-foreground" />
            </span>
          </TooltipWrapper>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </>
    );
  }

  if (field.name === "createdBy" || field.name === "updatedBy") {
    const users: any[] = relationOptions[field.name] ?? [];
    const matchedUser = users.find(
      (u) => u?.id?.toString() === value?.toString()
    );
    const displayText = matchedUser?.email ?? String(value ?? "—");

    return (
      <TruncatedText
        content={displayText}
        bold={field.bold}
        className="text-sm"
      />
    );
  }

  if (field.type === "relation" && field.relation) {
    const options: any[] = relationOptions[field.name] ?? [];
    const { valueField, labelField, multiple } = field.relation;

    if (multiple && Array.isArray(value)) {
      const matched = value
        .map((v: any) =>
          options.find((opt) => opt[valueField]?.toString() === v?.toString())
        )
        .filter(Boolean);
      return (
        <BadgeList
          items={matched}
          labelField={labelField}
          valueField={valueField}
          maxVisible={MAX_CARD_BADGES}
        />
      );
    }

    const matched = options.find(
      (opt) => opt[valueField]?.toString() === value?.toString()
    );
    const displayText = matched ? matched[labelField] : (value ?? "—");
    return (
      <TruncatedText
        content={String(displayText)}
        bold={field.bold}
        className="text-sm"
      />
    );
  }

  if (field.type === "date" && value) {
    try {
      const formatted = new Date(value).toLocaleDateString("vi-VN", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });
      return (
        <TruncatedText
          content={formatted}
          bold={field.bold}
          className="text-sm"
        />
      );
    } catch {
      return (
        <TruncatedText
          content={String(value)}
          bold={field.bold}
          className="text-sm"
        />
      );
    }
  }

  // Handle arrays (e.g. question options)
  if (Array.isArray(value)) {
    if (value.length === 0) {
      return <span className="text-xs text-muted-foreground">—</span>;
    }

    const firstItem = value[0];
    if (typeof firstItem === "object" && firstItem !== null && "content" in firstItem) {
      const optionsText = value
        .map((opt: any, idx: number) =>
          `${String.fromCharCode(65 + idx)}. ${opt.content}${opt.correct ? " ✓" : ""}`
        )
        .join("\n");

      return (
        <TooltipWrapper content={optionsText}>
          <span className="text-xs text-muted-foreground cursor-help">
            {value.length} lựa chọn
          </span>
        </TooltipWrapper>
      );
    }

    // Array of primitives
    return (
      <TruncatedText
        content={value.join(", ")}
        bold={field.bold}
        className="text-sm"
      />
    );
  }

  const displayValue = String(value ?? "—");
  return (
    <TruncatedText
      content={displayValue}
      bold={field.bold}
      className="text-sm"
    />
  );
}
