import { useRef, useState } from "react";
import { ImageOff, ImagePlus, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { fileApi } from "@/api/features/file.api";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { FieldSchema } from "@/types";

import { FieldError } from "./FieldError";

const MAX_SIZE = 5 * 1024 * 1024; // 5 MB
const ACCEPT = "image/*";

interface ImageFieldProps {
    field: FieldSchema;
    /** Current URL (or empty string when no image). */
    value: string | null | undefined;
    onChange: (name: string, value: string) => void;
    errorClass?: string;
    fieldErrors?: string[];
    /** Optional entity context — forwarded to the upload endpoint so
     *  the file row in BE can be associated with the right entity. */
    entityName?: string;
    entityId?: number;
}

/**
 * Drag-and-drop image upload field with live preview.
 *
 * Two states share the same dropzone outline:
 *
 *   Empty:  ┌────────────────────────┐
 *           │   📷 Click hoặc kéo thả │
 *           │   PNG, JPG, WEBP · 5MB  │
 *           └────────────────────────┘
 *
 *   Filled: ┌──────────┬─────────────┐
 *           │  [IMG]   │ filename    │
 *           │  80×80   │ [↻ Thay][🗑]│
 *           └──────────┴─────────────┘
 *
 * The actual `<input type=file>` is always rendered (hidden) so both
 * "click to browse" and "drop to upload" paths share one handler.
 * Re-picking the same file twice still fires `onChange` because we
 * clear `fileRef.current.value` after each upload.
 */
export function ImageField({
    field,
    value,
    onChange,
    errorClass,
    fieldErrors,
    entityName,
    entityId,
}: ImageFieldProps) {
    const [uploading, setUploading] = useState(false);
    const [dragging, setDragging] = useState(false);
    const [imageBroken, setImageBroken] = useState(false);
    const fileRef = useRef<HTMLInputElement>(null);

    const hasValue = typeof value === "string" && value.length > 0;

    const validate = (file: File): string | null => {
        if (!file.type.startsWith("image/")) return "File phải là hình ảnh.";
        if (file.size > MAX_SIZE) return "Hình vượt quá 5MB.";
        return null;
    };

    const upload = async (file: File) => {
        const err = validate(file);
        if (err) {
            toast.error(err);
            return;
        }
        setUploading(true);
        setImageBroken(false);
        try {
            const res = await fileApi.upload(file, entityName, entityId, field.name);
            onChange(field.name, res.url);
        } catch {
            toast.error("Upload thất bại. Hãy thử lại.");
        } finally {
            setUploading(false);
            // Reset so re-selecting the same file fires `change` again.
            if (fileRef.current) fileRef.current.value = "";
        }
    };

    const pickFile = () => fileRef.current?.click();

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) upload(file);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setDragging(false);
        if (uploading) return;
        const file = e.dataTransfer.files?.[0];
        if (file) upload(file);
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        if (uploading) return;
        if (!dragging) setDragging(true);
    };

    const remove = () => {
        // We don't call fileApi.delete here on purpose — the URL may
        // still be referenced by other records, and orphan file
        // cleanup is the BE's concern. Setting the field to empty
        // string is enough to detach this entity from the asset.
        onChange(field.name, "");
        setImageBroken(false);
    };

    const filename =
        hasValue && typeof value === "string"
            ? decodeURIComponent(value.split("/").pop() ?? "")
            : "";

    return (
        <div className="grid gap-2">
            <Label htmlFor={field.name}>{field.label}</Label>

            <div
                onDragOver={handleDragOver}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
                className={cn(
                    "relative rounded-md border-2 border-dashed transition-colors",
                    dragging
                        ? "border-primary bg-primary/5"
                        : "border-input bg-background",
                    errorClass,
                )}
            >
                {hasValue && !imageBroken ? (
                    <div className="flex items-center gap-3 p-3">
                        <div className="relative h-20 w-20 shrink-0 rounded-md overflow-hidden bg-muted border">
                            <img
                                src={value!}
                                alt={field.label}
                                className="absolute inset-0 h-full w-full object-cover"
                                onError={() => setImageBroken(true)}
                            />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium truncate" title={filename}>
                                {filename || "image"}
                            </p>
                            <p className="text-[10px] text-muted-foreground">
                                PNG, JPG, WEBP — tối đa 5MB
                            </p>
                            <div className="mt-2 flex gap-1.5">
                                <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    onClick={pickFile}
                                    disabled={uploading}
                                    className="h-7 px-2 text-xs gap-1"
                                >
                                    {uploading ? (
                                        <Loader2
                                            size={12}
                                            className="animate-spin"
                                        />
                                    ) : (
                                        <ImagePlus size={12} />
                                    )}
                                    {uploading ? "Đang tải" : "Thay"}
                                </Button>
                                <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    onClick={remove}
                                    disabled={uploading}
                                    className="h-7 px-2 text-xs gap-1 text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                                >
                                    <Trash2 size={12} />
                                    Xóa
                                </Button>
                            </div>
                        </div>
                    </div>
                ) : (
                    <button
                        type="button"
                        onClick={pickFile}
                        disabled={uploading}
                        className={cn(
                            "w-full flex flex-col items-center justify-center gap-2 px-4 py-6 text-center transition-colors cursor-pointer",
                            "hover:bg-accent/30 disabled:cursor-wait disabled:opacity-70",
                        )}
                    >
                        {uploading ? (
                            <Loader2
                                size={28}
                                className="text-muted-foreground animate-spin"
                            />
                        ) : imageBroken ? (
                            <ImageOff size={28} className="text-muted-foreground" />
                        ) : (
                            <ImagePlus size={28} className="text-muted-foreground" />
                        )}
                        <div className="text-xs leading-tight">
                            <span className="font-medium text-primary">
                                Click để chọn
                            </span>
                            <span className="text-muted-foreground"> hoặc kéo thả</span>
                        </div>
                        <p className="text-[10px] text-muted-foreground leading-tight">
                            {imageBroken
                                ? "Hình hiện không tải được — thử upload lại"
                                : "PNG, JPG, WEBP — tối đa 5MB"}
                        </p>
                    </button>
                )}

                <input
                    ref={fileRef}
                    id={field.name}
                    type="file"
                    accept={ACCEPT}
                    className="hidden"
                    onChange={handleInputChange}
                />
            </div>

            <FieldError errors={fieldErrors} />
        </div>
    );
}
