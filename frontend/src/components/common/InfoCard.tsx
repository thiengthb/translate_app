import {
    Card,
    CardAction,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

import { InfoLabel } from "./InfoLabel";

interface InfoCardProps {
    /** Leading icon shown before the title (e.g. a lucide element). */
    icon?: React.ReactNode;
    /** Card title text. */
    title: string;
    /** Description — surfaced behind the ⓘ icon next to the title instead of
     *  taking up a whole description row. */
    info?: string;
    /** Optional right-aligned header controls (e.g. a segmented control). */
    actions?: React.ReactNode;
    children: React.ReactNode;
    className?: string;
    contentClassName?: string;
}

/**
 * Card whose title row is an {@link InfoLabel}: `[icon] Title ⓘ`, where the
 * ⓘ reveals `info` on hover. Keeps the header compact (no separate
 * description line) so the card body gets the space.
 */
export function InfoCard({
    icon,
    title,
    info,
    actions,
    children,
    className,
    contentClassName,
}: InfoCardProps) {
    return (
        <Card className={cn("h-full gap-3 py-4", className)}>
            <CardHeader className="px-4 gap-0.5">
                <CardTitle className="text-sm flex items-center gap-2">
                    {icon}
                    <InfoLabel title={title} info={info} />
                </CardTitle>
                {actions && <CardAction className="self-center">{actions}</CardAction>}
            </CardHeader>
            <CardContent className={cn("px-4", contentClassName)}>
                {children}
            </CardContent>
        </Card>
    );
}
