import { useMemo, useState } from "react";
import { Check, Loader2, X } from "lucide-react";

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import type { EntitySchema } from "@/types";

interface BulkEditModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    schema: EntitySchema;
    selectedCount: number;
    relationOptions?: Record<string, any[]>;
    /** Apply the patch to each selected row. Returns when all done. */
    onApply: (patch: Record<string, any>) => Promise<void>;
}

/**
 * Bulk-edit modal: pick which fields to update and the new value, then apply
 * to all selected rows. Only fields marked `editable` in the schema show up.
 */
export function BulkEditModal({
    open,
    onOpenChange,
    schema,
    selectedCount,
    relationOptions = {},
    onApply,
}: BulkEditModalProps) {
    const editableFields = useMemo(
        () =>
            schema.fields.filter(
                (f) =>
                    f.editable !== false &&
                    f.type !== "password" &&
                    !["createdAt", "updatedAt", "createdBy", "updatedBy", "version", "id"].includes(
                        f.name,
                    ),
            ),
        [schema.fields],
    );

    // Field-name → enabled flag (only enabled fields will be sent in patch)
    const [enabled, setEnabled] = useState<Record<string, boolean>>({});
    const [values, setValues] = useState<Record<string, any>>({});
    const [submitting, setSubmitting] = useState(false);

    const toggleField = (name: string) =>
        setEnabled((prev) => ({ ...prev, [name]: !prev[name] }));

    const handleApply = async () => {
        const patch: Record<string, any> = {};
        for (const f of editableFields) {
            if (!enabled[f.name]) continue;
            patch[f.name] = values[f.name];
        }
        if (Object.keys(patch).length === 0) {
            toast.error("Chọn ít nhất 1 trường để cập nhật");
            return;
        }

        try {
            setSubmitting(true);
            await onApply(patch);
            toast.success(`Đã cập nhật ${selectedCount} bản ghi`);
            handleClose();
        } catch (err: any) {
            toast.error(err?.response?.data?.message ?? "Không thể cập nhật");
        } finally {
            setSubmitting(false);
        }
    };

    const handleClose = () => {
        setEnabled({});
        setValues({});
        onOpenChange(false);
    };

    const enabledCount = Object.values(enabled).filter(Boolean).length;

    return (
        <Dialog open={open} onOpenChange={(o) => !submitting && (o ? onOpenChange(o) : handleClose())}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        Sửa hàng loạt
                        <Badge variant="secondary" className="font-normal">
                            {selectedCount} bản ghi
                        </Badge>
                    </DialogTitle>
                    <DialogDescription>
                        Chọn các trường muốn áp dụng cùng giá trị cho tất cả bản ghi đã chọn.
                    </DialogDescription>
                </DialogHeader>

                <div className="max-h-[420px] overflow-y-auto -mx-6 px-6 space-y-3">
                    {editableFields.map((f) => {
                        const isEnabled = !!enabled[f.name];
                        return (
                            <div
                                key={f.name}
                                className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
                                    isEnabled ? "bg-primary/5 border-primary/30" : "bg-card border-border"
                                }`}
                            >
                                <Checkbox
                                    checked={isEnabled}
                                    onCheckedChange={() => toggleField(f.name)}
                                    className="mt-1.5"
                                    id={`bulk-${f.name}`}
                                />
                                <div className="flex-1 min-w-0">
                                    <Label htmlFor={`bulk-${f.name}`} className="cursor-pointer">
                                        {f.label}
                                    </Label>
                                    <div className={`mt-1.5 ${isEnabled ? "" : "opacity-40 pointer-events-none"}`}>
                                        <FieldValueInput
                                            field={f}
                                            value={values[f.name]}
                                            onChange={(v) =>
                                                setValues((prev) => ({ ...prev, [f.name]: v }))
                                            }
                                            options={relationOptions[f.name]}
                                        />
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                <DialogFooter className="gap-2">
                    <Button variant="outline" onClick={handleClose} disabled={submitting}>
                        <X size={14} />
                        Hủy
                    </Button>
                    <Button
                        onClick={handleApply}
                        disabled={submitting || enabledCount === 0}
                        className="gap-1.5"
                    >
                        {submitting ? (
                            <Loader2 size={14} className="animate-spin" />
                        ) : (
                            <Check size={14} />
                        )}
                        Áp dụng cho {selectedCount} bản ghi
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

// ─── Field-aware value input ───────────────────────────────────────────────

interface FieldValueInputProps {
    field: any;
    value: any;
    onChange: (v: any) => void;
    options?: any[];
}

function FieldValueInput({ field, value, onChange, options }: FieldValueInputProps) {
    switch (field.type) {
        case "boolean":
            return (
                <div className="flex items-center gap-2">
                    <Switch checked={!!value} onCheckedChange={onChange} />
                    <span className="text-sm text-muted-foreground">
                        {value ? field.booleanLabels?.true ?? "Có" : field.booleanLabels?.false ?? "Không"}
                    </span>
                </div>
            );

        case "relation": {
            const rel = field.relation;
            if (!rel || !options) return <Input value={value ?? ""} onChange={(e) => onChange(e.target.value)} />;
            return (
                <Select
                    value={value != null ? String(value) : undefined}
                    onValueChange={(v) => onChange(v)}
                >
                    <SelectTrigger className="h-9">
                        <SelectValue placeholder={`Chọn ${field.label.toLowerCase()}…`} />
                    </SelectTrigger>
                    <SelectContent>
                        {options.map((opt) => (
                            <SelectItem
                                key={opt[rel.valueField]}
                                value={String(opt[rel.valueField])}
                            >
                                {opt[rel.labelField]}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            );
        }

        case "number":
            return (
                <Input
                    type="number"
                    value={value ?? ""}
                    onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
                />
            );

        case "date":
            return (
                <Input
                    type="datetime-local"
                    value={value ?? ""}
                    onChange={(e) => onChange(e.target.value)}
                />
            );

        default:
            return <Input value={value ?? ""} onChange={(e) => onChange(e.target.value)} />;
    }
}
