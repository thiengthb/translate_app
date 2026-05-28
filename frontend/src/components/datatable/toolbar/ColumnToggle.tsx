import { Button } from "@/components/ui/button";
import { TooltipWrapper } from "@/components/datatable/common/TooltipWrapper";
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Columns3 } from "lucide-react";

interface ColumnToggleProps {
    schema: any;
    columnVisibility: Record<string, boolean>;
    toggleFieldVisibility: (name: string, value: boolean) => void;
}

export function ColumnToggle({
    schema,
    columnVisibility,
    toggleFieldVisibility,
}: ColumnToggleProps) {
    return (
        <DropdownMenu>
            <TooltipWrapper content="Hiện / ẩn cột">
                <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="icon" className="h-9 w-9" aria-label="Toggle columns">
                        <Columns3 size={15} />
                    </Button>
                </DropdownMenuTrigger>
            </TooltipWrapper>
            <DropdownMenuContent align="start" className="w-56">
                <DropdownMenuLabel className="text-xs">Hiện / ẩn cột</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {schema.fields
                    .filter((field: any) => field.hideable !== false)
                    .map((field: any) => (
                        <DropdownMenuCheckboxItem
                            key={field.name}
                            className="text-sm"
                            checked={columnVisibility[field.name] !== false}
                            onCheckedChange={(value) => {
                                toggleFieldVisibility(field.name, value);
                            }}
                            onSelect={(e) => e.preventDefault()}
                        >
                            {field.label ?? field.name}
                        </DropdownMenuCheckboxItem>
                    ))}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
