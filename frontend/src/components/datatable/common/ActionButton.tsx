import { GripVertical } from "lucide-react";
import { TooltipWrapper } from "@/components/datatable/common/TooltipWrapper";
import { Button } from "@/components/ui/button";

interface ActionButtonProps {
    onClick: () => void;
    title?: string;
    tooltip?: string;
    variant?: "outline" | "ghost" | "default" | "destructive" | "secondary";
    icon?: React.ReactNode;
    disabled?: boolean;
    className?: string;
}

/**
 * Icon-only toolbar button with tooltip. `title` and `tooltip` both feed the
 * tooltip; UI is always just the icon so the toolbar can stay single-row.
 */
const ActionButton = ({
    onClick,
    title,
    tooltip,
    variant = "outline",
    icon = <GripVertical size={15} className="text-muted-foreground" />,
    disabled = false,
    className,
}: ActionButtonProps) => {
    return (
        <TooltipWrapper content={tooltip || title || "Action"}>
            <Button
                variant={variant}
                size="icon"
                onClick={onClick}
                disabled={disabled}
                aria-label={tooltip || title}
                className={`h-9 w-9 ${className ?? ""}`}
            >
                {icon}
            </Button>
        </TooltipWrapper>
    );
};

export default ActionButton;
