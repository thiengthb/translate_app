import { Download, Plus, Printer, Upload } from "lucide-react";
import { useState } from "react";
import ActionButton from "../common/ActionButton";
import { ImportResultModal } from "../dataio/ImportResultModal";
import { ImportModal } from "../dataio/ImportModal";
import { ExportModal } from "../dataio/ExportModal";
import type { ImportResult } from "@/types";
import { PermissionGate } from "@/components/PermissionGate";

interface ToolbarActionsProps {
    table: any;
    headerActions?: React.ReactNode;
}

export function ToolbarActions({ table, headerActions }: ToolbarActionsProps) {
    const [importOpen, setImportOpen] = useState(false);
    const [exportOpen, setExportOpen] = useState(false);
    const [importResult, setImportResult] = useState<ImportResult | null>(null);
    const [resultOpen, setResultOpen] = useState(false);

    const handleImportSuccess = (result: ImportResult) => {
        setImportResult(result);
        setResultOpen(true);
    };

    return (
        <div className="flex items-center gap-1.5">
            <PermissionGate permission={table.permission?.keys?.import}>
                <ActionButton
                    onClick={() => setImportOpen(true)}
                    tooltip="Nhập dữ liệu"
                    variant="outline"
                    icon={<Upload size={15} />}
                />
            </PermissionGate>

            <PermissionGate permission={table.permission?.keys?.export}>
                <ActionButton
                    onClick={() => setExportOpen(true)}
                    tooltip="Xuất dữ liệu"
                    variant="outline"
                    icon={<Download size={15} />}
                />
            </PermissionGate>

            <ActionButton
                onClick={() => window.print()}
                tooltip="In bảng (Ctrl+P)"
                variant="outline"
                icon={<Printer size={15} />}
            />

            {headerActions || (
                <PermissionGate permission={table.permission?.keys?.create}>
                    <ActionButton
                        onClick={() => table.openCreate()}
                        tooltip="Tạo mới"
                        variant="default"
                        icon={<Plus size={15} />}
                    />
                </PermissionGate>
            )}

            <ImportModal
                open={importOpen}
                onOpenChange={setImportOpen}
                table={table}
                onImportSuccess={handleImportSuccess}
                canImport={table.permission?.canImport}
            />

            <ExportModal
                open={exportOpen}
                onOpenChange={setExportOpen}
                table={table}
                canExport={table.permission?.canExport}
            />

            <ImportResultModal
                open={resultOpen}
                onOpenChange={setResultOpen}
                result={importResult}
                onBackToImport={() => {
                    setResultOpen(false);
                    setImportOpen(true);
                }}
            />
        </div>
    );
}
