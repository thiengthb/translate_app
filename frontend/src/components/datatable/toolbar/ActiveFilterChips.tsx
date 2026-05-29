import { X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface ActiveFilterChipsProps {
    schema: { fields: any[] };
    filters: Record<string, any>;
    relationOptions?: Record<string, Array<{ value: any; label: string }>>;
    onRemove: (field: string) => void;
    onClearAll: () => void;
}

export function ActiveFilterChips({
    schema,
    filters,
    relationOptions,
    onRemove,
    onClearAll,
}: ActiveFilterChipsProps) {
    const chips = Object.entries(filters || {})
        .filter(([, value]) => !isEmpty(value))
        .map(([fieldName, value]) => {
            const field = schema.fields.find((f) => f.name === fieldName);
            return {
                fieldName,
                label: field?.label ?? fieldName,
                display: formatValue(value, field, relationOptions?.[fieldName]),
            };
        });

    if (chips.length === 0) return null;

    return (
        <div className="flex flex-wrap items-center gap-1.5 px-1 py-2">
            <span className="text-xs text-muted-foreground font-medium mr-1">Đang lọc:</span>
            {chips.map((c) => (
                <Badge
                    key={c.fieldName}
                    variant="secondary"
                    className="gap-1.5 pl-2 pr-1 py-0.5 font-normal text-xs"
                >
                    <span className="text-muted-foreground">{c.label}:</span>
                    <span className="text-foreground font-medium">{c.display}</span>
                    <button
                        type="button"
                        onClick={() => onRemove(c.fieldName)}
                        className="ml-0.5 rounded p-0.5 hover:bg-background/60 transition-colors cursor-pointer"
                        aria-label={`Remove ${c.label} filter`}
                    >
                        <X size={12} />
                    </button>
                </Badge>
            ))}
            {chips.length > 1 && (
                <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
                    onClick={onClearAll}
                >
                    Xóa tất cả
                </Button>
            )}
        </div>
    );
}

function isEmpty(value: any): boolean {
    if (value === null || value === undefined) return true;
    if (value === "") return true;
    if (Array.isArray(value) && value.length === 0) return true;
    if (typeof value === "object" && Object.keys(value).length === 0) return true;
    return false;
}

function formatValue(
    value: any,
    field?: any,
    relationLookup?: Array<{ value: any; label: string }>,
): string {
    if (typeof value === "boolean") return value ? "Có" : "Không";

    if (Array.isArray(value)) {
        if (relationLookup) {
            const labels = value.map((v) => {
                const found = relationLookup.find((o) => String(o.value) === String(v));
                return found?.label ?? String(v);
            });
            return labels.join(", ");
        }
        return value.join(", ");
    }

    if (relationLookup) {
        const found = relationLookup.find((o) => String(o.value) === String(value));
        if (found) return found.label;
    }

    if (field?.type === "date" && typeof value === "string") {
        try {
            return new Date(value).toLocaleDateString("vi-VN");
        } catch {
            return String(value);
        }
    }

    return String(value);
}
