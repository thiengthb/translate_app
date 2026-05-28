import { Check, Rows2, Rows3, Rows4 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TooltipWrapper } from "@/components/datatable/common/TooltipWrapper";
import type { Density } from "@/components/datatable/hook/useDensity";

interface DensityToggleProps {
    density: Density;
    onChange: (density: Density) => void;
}

const OPTIONS: { value: Density; label: string; icon: React.ComponentType<{ size?: number }> }[] = [
    { value: "compact", label: "Compact", icon: Rows4 },
    { value: "normal", label: "Normal", icon: Rows3 },
    { value: "comfortable", label: "Comfortable", icon: Rows2 },
];

export function DensityToggle({ density, onChange }: DensityToggleProps) {
    const current = OPTIONS.find((o) => o.value === density) ?? OPTIONS[1];
    const CurrentIcon = current.icon;

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <div>
                    <TooltipWrapper content="Mật độ hiển thị">
                        <Button variant="outline" size="icon" className="h-9 w-9" aria-label="Density">
                            <CurrentIcon size={15} />
                        </Button>
                    </TooltipWrapper>
                </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuLabel className="text-xs">Mật độ hiển thị</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {OPTIONS.map((opt) => {
                    const Icon = opt.icon;
                    const isActive = density === opt.value;
                    return (
                        <DropdownMenuItem
                            key={opt.value}
                            onSelect={() => onChange(opt.value)}
                            className="gap-2 text-sm"
                        >
                            <Icon size={14} />
                            <span className="flex-1">{opt.label}</span>
                            {isActive && <Check size={13} className="text-primary" />}
                        </DropdownMenuItem>
                    );
                })}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
