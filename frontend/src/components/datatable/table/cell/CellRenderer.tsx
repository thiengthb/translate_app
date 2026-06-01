import { TableCell } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { TooltipWrapper } from "@/components/datatable/common/TooltipWrapper";
import { TruncatedText } from "@/components/datatable/common/TruncatedText";
import { iconMap } from "@/components/datatable/iconMap";
import type { FieldSchema } from "@/types";
import { OverflowBadges } from "./OverflowBadges";
import { formatDateValue } from "./dateFormat";
import { EditableCell } from "./EditableCell";

// Re-export for backward compatibility
export type { DateFormatKey } from "./dateFormat";
export { DATE_FORMAT_CYCLE, DATE_FORMAT_LABELS, formatDateValue } from "./dateFormat";
export { OverflowBadges } from "./OverflowBadges";

interface CellRendererProps {
  field: FieldSchema;
  value: any;
  relationOptions?: Record<string, any[]>;
  onBooleanToggle?: (fieldName: string, newValue: boolean) => void;
  disableBooleanToggle?: boolean;
  dateFormat?: import("./dateFormat").DateFormatKey;
  /** Optional inline-edit commit handler. When provided, editable types render as click-to-edit. */
  onInlineEdit?: (fieldName: string, newValue: any) => void | Promise<void>;
  /** Sticky positioning style when this cell is pinned. */
  pinStyle?: React.CSSProperties;
  /** Extra classes for pinned cells. */
  pinClassName?: string;
}

/** Field types that support click-to-edit inline. */
const INLINE_EDITABLE_TYPES = new Set(["string", "text", "number", "relation"]);

/**
 * Image fields store URLs as strings. `String(null)` would render as
 * "null" → broken image; this helper normalizes to a clean URL or null.
 */
function coerceImageUrl(value: unknown): string | null {
  if (value === null || value === undefined || value === "") return null;
  const s = String(value).trim();
  return s ? s : null;
}

export function CellRenderer({
  field,
  value,
  relationOptions = {},
  onBooleanToggle,
  disableBooleanToggle = false,
  dateFormat,
  onInlineEdit,
  pinStyle,
  pinClassName,
}: CellRendererProps) {
  if (field.type === "image") {
    const url = coerceImageUrl(value);
    return (
      <TableCell style={pinStyle} className={pinClassName}>
        {url ? (
          <TooltipWrapper content={url}>
            {/* Compact 32px thumbnail with rounded border — sized to
                fit the default row height without bloating it. */}
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-8 w-8 overflow-hidden rounded-md border bg-muted shrink-0 hover:ring-2 hover:ring-primary/40 transition"
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
          </TooltipWrapper>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </TableCell>
    );
  }

  if (field.type === "boolean") {
    const labels = field.booleanLabels || { true: "Yes", false: "No" };
    const label = value ? labels.true : labels.false;
    return (
      <TableCell style={pinStyle} className={pinClassName}>
        <TooltipWrapper content={label}>
          <div className="inline-flex">
            <Switch
              checked={!!value}
              disabled={disableBooleanToggle || !onBooleanToggle}
              onCheckedChange={(checked) =>
                onBooleanToggle?.(field.name, checked)
              }
              className="data-[state=checked]:bg-primary data-[state=unchecked]:bg-primary/40"
            />
          </div>
        </TooltipWrapper>
      </TableCell>
    );
  }

  if (field.type === "icon" || field.name === "icon") {
    const iconKey = value?.toString();
    const Icon =
      iconKey && iconKey in iconMap
        ? iconMap[iconKey as keyof typeof iconMap]
        : null;

    return (
      <TableCell style={pinStyle} className={pinClassName}>
        {Icon ? (
          <TooltipWrapper content={iconKey || "—"}>
            <span className="inline-flex items-center">
              <Icon className="h-4 w-4 text-muted-foreground" />
            </span>
          </TooltipWrapper>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </TableCell>
    );
  }

  if (field.name === "createdBy" || field.name === "updatedBy") {
    const users: any[] = relationOptions[field.name] ?? [];
    const matchedUser = users.find(
      (u) => u?.id?.toString() === value?.toString()
    );
    const displayText = matchedUser?.email ?? String(value ?? "—");

    return (
      <TableCell style={pinStyle} className={pinClassName}>
        <TruncatedText content={displayText} bold={field.bold} />
      </TableCell>
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
        <TableCell style={pinStyle} className={pinClassName}>
          {matched.length > 0 ? (
            <OverflowBadges
              items={matched}
              labelField={labelField}
              valueField={valueField}
            />
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
        </TableCell>
      );
    }

    const matched = options.find(
      (opt) => opt[valueField]?.toString() === value?.toString()
    );
    const displayText = matched ? matched[labelField] : (value ?? "—");
    const displayNode = <TruncatedText content={String(displayText)} bold={field.bold} />;
    return (
      <TableCell style={pinStyle} className={pinClassName}>
        {onInlineEdit && field.editable !== false ? (
          <EditableCell
            value={value}
            field={field}
            relationOptions={options}
            onCommit={(v) => onInlineEdit(field.name, v)}
          >
            {displayNode}
          </EditableCell>
        ) : (
          displayNode
        )}
      </TableCell>
    );
  }

  // Handle arrays (like question options)
  if (Array.isArray(value)) {
    if (value.length === 0) {
      return (
        <TableCell style={pinStyle} className={pinClassName}>
          <span className="text-muted-foreground">—</span>
        </TableCell>
      );
    }

    // Check if it's an array of objects (like question options)
    const firstItem = value[0];
    if (typeof firstItem === "object" && firstItem !== null) {
      // For question options, show count with tooltip of contents
      if ("content" in firstItem) {
        const optionsText = value
          .map((opt: any, idx: number) =>
            `${String.fromCharCode(65 + idx)}. ${opt.content}${opt.correct ? " ✓" : ""}`
          )
          .join("\n");

        return (
          <TableCell style={pinStyle} className={pinClassName}>
            <TooltipWrapper content={optionsText}>
              <span className="text-muted-foreground cursor-help">
                {value.length} option{value.length !== 1 ? "s" : ""}
              </span>
            </TooltipWrapper>
          </TableCell>
        );
      }
    }

    // Array of primitives
    return (
      <TableCell style={pinStyle} className={pinClassName}>
        <TruncatedText content={value.join(", ")} bold={field.bold} />
      </TableCell>
    );
  }

  const displayValue = value ?? "—";
  const displayStr =
    field.type === "date" && value
      ? formatDateValue(value, dateFormat)
      : String(displayValue);

  const isInlineEditable =
    onInlineEdit &&
    field.editable !== false &&
    INLINE_EDITABLE_TYPES.has(field.type ?? "string");

  const displayNode = <TruncatedText content={displayStr} bold={field.bold} />;

  return (
    <TableCell>
      {isInlineEditable ? (
        <EditableCell
          value={value}
          field={field}
          onCommit={(v) => onInlineEdit!(field.name, v)}
        >
          {displayNode}
        </EditableCell>
      ) : (
        displayNode
      )}
    </TableCell>
  );
}
