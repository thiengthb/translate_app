import { useState } from "react";

/**
 * Bundles the four overlay states ProTable manages internally when the
 * consumer doesn't supply external handlers:
 *
 *   - delete confirmation
 *   - detail (row preview)
 *   - bulk edit modal
 *   - bulk delete confirmation
 *
 * Loading flags live alongside the open/close state so a single setter
 * pair drives both the modal visibility and its submit spinner.
 */
export function useProTableModals<TData>() {
    const [deleteItem, setDeleteItem] = useState<TData | null>(null);
    const [deleteLoading, setDeleteLoading] = useState(false);
    const [detailRow, setDetailRow] = useState<TData | null>(null);
    const [bulkEditOpen, setBulkEditOpen] = useState(false);
    const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
    const [bulkDeleteLoading, setBulkDeleteLoading] = useState(false);

    return {
        deleteItem,
        setDeleteItem,
        deleteLoading,
        setDeleteLoading,
        detailRow,
        setDetailRow,
        bulkEditOpen,
        setBulkEditOpen,
        bulkDeleteOpen,
        setBulkDeleteOpen,
        bulkDeleteLoading,
        setBulkDeleteLoading,
    };
}
