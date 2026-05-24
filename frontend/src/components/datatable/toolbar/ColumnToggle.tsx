import { Button } from "@/components/ui/button";
import { TooltipWrapper } from "@/components/datatable/common/TooltipWrapper";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown } from "lucide-react";

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
      <TooltipWrapper content="Toggle columns">
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            className="w-full !outline-none lg:w-auto"
          >
            <ChevronDown />
            <span className="mr-1">Columns</span>
          </Button>
        </DropdownMenuTrigger>
      </TooltipWrapper>
      <DropdownMenuContent align="end">
        {schema.fields
          .filter((field: any) => field.hideable !== false)
          .map((field: any) => (
            <DropdownMenuCheckboxItem
              key={field.name}
              className="capitalize"
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
