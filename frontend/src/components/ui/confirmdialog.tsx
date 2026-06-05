// src/components/ui/confirmdialog.tsx
import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Loader2, Trash2 } from "lucide-react";

/**
 * Confirmation dialog. Defaults to the destructive (delete) style — red Trash
 * chip + red confirm button. Pass `tone="warning"` for a non-destructive guard
 * (e.g. "discard unsaved changes?") which uses an amber alert chip and the
 * primary confirm button. Labels stay configurable so callers can localize.
 */
export const ConfirmDialog: React.FC<{
  open: boolean;
  title?: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
  tone?: "danger" | "warning";
}> = ({
  open,
  title = "Xác nhận xóa",
  description,
  confirmLabel = "Xóa",
  cancelLabel = "Hủy",
  onConfirm,
  onCancel,
  loading = false,
  tone = "danger",
}) => {
  const displayDescription =
    description ||
    "Bạn có chắc chắn muốn xóa mục này? Hành động này không thể hoàn tác.";

  const isDanger = tone === "danger";

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        // Esc / overlay click / close button → cancel (unless an action is in flight).
        if (!next && !loading) onCancel();
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div
              className={
                "flex h-10 w-10 items-center justify-center rounded-full " +
                (isDanger
                  ? "bg-red-100 dark:bg-red-900/30"
                  : "bg-amber-100 dark:bg-amber-900/30")
              }
            >
              {isDanger ? (
                <Trash2 className="h-5 w-5 text-red-600" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-amber-600" />
              )}
            </div>
            {title}
          </DialogTitle>
          <DialogDescription className="pt-2">
            {displayDescription}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <div className="flex w-full justify-between">
            <Button variant="outline" onClick={onCancel} disabled={loading}>
              {cancelLabel}
            </Button>
            <Button
              variant={isDanger ? "destructive" : "default"}
              onClick={onConfirm}
              disabled={loading}
              className={isDanger ? "bg-red-600 hover:bg-red-700" : undefined}
            >
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : isDanger ? (
                <Trash2 className="mr-2 h-4 w-4" />
              ) : null}
              {confirmLabel}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ConfirmDialog;
