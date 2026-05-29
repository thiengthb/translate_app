import { useEffect, useRef, useState } from "react";
import { Check, Pencil, X } from "lucide-react";

import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

interface EditableCellProps {
    value: any;
    field: any;
    relationOptions?: any[];
    disabled?: boolean;
    onCommit: (newValue: any) => Promise<void> | void;
    /** Renderer for the read-only display value. Required. */
    children: React.ReactNode;
}

const EDITABLE_TYPES = new Set(["string", "text", "number", "relation"]);

/**
 * Wrap a cell value to make it click-to-edit. Renders `children` by default;
 * on click, swaps to an inline input. Commits on Enter / blur, cancels on Esc.
 *
 * Only enabled for types in EDITABLE_TYPES; other types render `children`
 * unchanged.
 */
export function EditableCell({
    value,
    field,
    relationOptions,
    disabled,
    onCommit,
    children,
}: EditableCellProps) {
    const isEditableType =
        EDITABLE_TYPES.has(field.type) || (!field.type && field.editable !== false);

    const [editing, setEditing] = useState(false);
    const [draft, setDraft] = useState<any>(value);
    const [saving, setSaving] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (editing) {
            setDraft(value);
            // Autofocus the next tick
            requestAnimationFrame(() => inputRef.current?.focus());
        }
    }, [editing, value]);

    if (!isEditableType || disabled || field.editable === false) {
        return <>{children}</>;
    }

    const commit = async () => {
        if (saving) return;
        if (draft === value) {
            setEditing(false);
            return;
        }
        setSaving(true);
        try {
            await onCommit(draft);
            setEditing(false);
        } finally {
            setSaving(false);
        }
    };

    const cancel = () => {
        setDraft(value);
        setEditing(false);
    };

    if (!editing) {
        return (
            <button
                type="button"
                onClick={(e) => {
                    e.stopPropagation();
                    setEditing(true);
                }}
                className="group/edit relative inline-flex items-center gap-1.5 w-full text-left rounded px-1 -mx-1 py-0.5 hover:bg-accent/60 cursor-text"
                data-no-row-click
                title="Click để chỉnh sửa"
            >
                <span className="flex-1 min-w-0 truncate">{children}</span>
                <Pencil
                    size={11}
                    className="text-muted-foreground opacity-0 group-hover/edit:opacity-100 transition-opacity shrink-0"
                />
            </button>
        );
    }

    return (
        <div
            className="flex items-center gap-1"
            onClick={(e) => e.stopPropagation()}
            data-no-row-click
        >
            {field.type === "relation" && relationOptions ? (
                <Select
                    value={draft != null ? String(draft) : undefined}
                    onValueChange={(v) => setDraft(v)}
                >
                    <SelectTrigger className="h-7 text-sm">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {relationOptions.map((opt: any) => {
                            const rel = field.relation;
                            return (
                                <SelectItem
                                    key={opt[rel.valueField]}
                                    value={String(opt[rel.valueField])}
                                >
                                    {opt[rel.labelField]}
                                </SelectItem>
                            );
                        })}
                    </SelectContent>
                </Select>
            ) : (
                <Input
                    ref={inputRef}
                    type={field.type === "number" ? "number" : "text"}
                    value={draft ?? ""}
                    onChange={(e) =>
                        setDraft(field.type === "number"
                            ? (e.target.value === "" ? null : Number(e.target.value))
                            : e.target.value)
                    }
                    onKeyDown={(e) => {
                        if (e.key === "Enter") {
                            e.preventDefault();
                            commit();
                        } else if (e.key === "Escape") {
                            e.preventDefault();
                            cancel();
                        }
                    }}
                    onBlur={() => {
                        // Defer so the action button clicks still register
                        setTimeout(() => {
                            if (document.activeElement?.closest("[data-editable-cell-actions]")) return;
                            commit();
                        }, 100);
                    }}
                    className="h-7 text-sm"
                />
            )}

            <div className="flex items-center gap-0.5" data-editable-cell-actions>
                <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={commit}
                    disabled={saving}
                    className="h-7 w-7 rounded inline-flex items-center justify-center text-emerald-600 hover:bg-emerald-500/10 cursor-pointer disabled:opacity-50"
                    aria-label="Save"
                >
                    <Check size={14} />
                </button>
                <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={cancel}
                    disabled={saving}
                    className="h-7 w-7 rounded inline-flex items-center justify-center text-muted-foreground hover:bg-accent cursor-pointer disabled:opacity-50"
                    aria-label="Cancel"
                >
                    <X size={14} />
                </button>
            </div>
        </div>
    );
}
