import { BarChart3, LayoutGrid, Table2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TooltipWrapper } from "@/components/datatable/common/TooltipWrapper";

export type ViewMode = "table" | "card" | "chart";

interface ViewModeToggleProps {
    mode: ViewMode;
    onChange: (mode: ViewMode) => void;
}

const MODES: { value: ViewMode; label: string; icon: React.ComponentType<{ size?: number }> }[] = [
    { value: "table", label: "Bảng", icon: Table2 },
    { value: "card", label: "Thẻ", icon: LayoutGrid },
    { value: "chart", label: "Biểu đồ", icon: BarChart3 },
];

export function ViewModeToggle({ mode, onChange }: ViewModeToggleProps) {
    return (
        <div className="inline-flex items-center gap-0.5 bg-muted/50 rounded-md p-0.5 h-9 border border-input">
            {MODES.map((m) => {
                const Icon = m.icon;
                const isActive = mode === m.value;
                return (
                    <TooltipWrapper key={m.value} content={m.label}>
                        <Button
                            variant={isActive ? "default" : "ghost"}
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => onChange(m.value)}
                            aria-label={m.label}
                        >
                            <Icon size={14} />
                        </Button>
                    </TooltipWrapper>
                );
            })}
        </div>
    );
}
