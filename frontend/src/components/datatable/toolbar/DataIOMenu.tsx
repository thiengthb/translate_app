import { useState } from "react";
import { ChevronDown, Download, Printer, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TooltipWrapper } from "@/components/datatable/common/TooltipWrapper";
import { ImportModal } from "../dataio/ImportModal";
import { ExportModal } from "../dataio/ExportModal";
import { ImportResultModal } from "../dataio/ImportResultModal";
import type { ImportResult } from "@/types";
import { usePermissions } from "@/hooks/usePermissions";

interface DataIOMenuProps {
    table: any;
}

export function DataIOMenu({ table }: DataIOMenuProps) {
    const { hasAnyPermission } = usePermissions();
    const [importOpen, setImportOpen] = useState(false);
    const [exportOpen, setExportOpen] = useState(false);
    const [importResult, setImportResult] = useState<ImportResult | null>(null);
    const [resultOpen, setResultOpen] = useState(false);

    const importPermission = table.permission?.keys?.import;
    const exportPermission = table.permission?.keys?.export;

    const canImport =
        !importPermission || hasAnyPermission([importPermission]);
    const canExport =
        !exportPermission || hasAnyPermission([exportPermission]);

    if (!canImport && !canExport) {
        return (
            <TooltipWrapper content="In bảng (Ctrl+P)">
                <Button
                    variant="outline"
                    size="icon"
                    className="h-9 w-9"
                    onClick={() => window.print()}
                    aria-label="Print"
                >
                    <Printer size={15} />
                </Button>
            </TooltipWrapper>
        );
    }

    const handleImportSuccess = (result: ImportResult) => {
        setImportResult(result);
        setResultOpen(true);
    };

    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <div>
                        <TooltipWrapper content="Nhập / Xuất / In dữ liệu">
                            <Button
                                variant="outline"
                                size="icon"
                                className="h-9 w-9 relative"
                                aria-label="Data input/output"
                            >
                                <Download size={15} />
                                <ChevronDown
                                    size={10}
                                    className="absolute bottom-0.5 right-0.5 text-muted-foreground"
                                />
                            </Button>
                        </TooltipWrapper>
                    </div>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44">
                    {canImport && (
                        <DropdownMenuItem
                            onSelect={() => setImportOpen(true)}
                            className="gap-2 text-sm"
                        >
                            <Upload size={14} />
                            Nhập dữ liệu
                        </DropdownMenuItem>
                    )}
                    {canExport && (
                        <DropdownMenuItem
                            onSelect={() => setExportOpen(true)}
                            className="gap-2 text-sm"
                        >
                            <Download size={14} />
                            Xuất dữ liệu
                        </DropdownMenuItem>
                    )}
                    <DropdownMenuItem
                        onSelect={() => window.print()}
                        className="gap-2 text-sm"
                    >
                        <Printer size={14} />
                        In bảng
                        <span className="ml-auto text-[10px] text-muted-foreground">
                            Ctrl+P
                        </span>
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

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
        </>
    );
}
