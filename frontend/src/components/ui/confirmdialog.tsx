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
import { Loader2, Trash2 } from "lucide-react";

/**
 * Destructive confirmation dialog — mirrors the ProTable delete modal
 * (`datatable/modal/ConfirmDeleteModal`): red Trash icon chip in the title,
 * a description, and an outline Cancel / red Delete button pair. Labels stay
 * configurable so callers can localize them.
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
}> = ({
  open,
  title = "Xác nhận xóa",
  description,
  confirmLabel = "Xóa",
  cancelLabel = "Hủy",
  onConfirm,
  onCancel,
  loading = false,
}) => {
  const displayDescription =
    description ||
    "Bạn có chắc chắn muốn xóa mục này? Hành động này không thể hoàn tác.";

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
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
              <Trash2 className="h-5 w-5 text-red-600" />
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
              variant="destructive"
              onClick={onConfirm}
              disabled={loading}
              className="bg-red-600 hover:bg-red-700"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {confirmLabel}
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  {confirmLabel}
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ConfirmDialog;
