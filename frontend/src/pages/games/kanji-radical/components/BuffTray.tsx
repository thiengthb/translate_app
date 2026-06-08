import { Sparkles } from "lucide-react";

import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { BUFFS, MAX_BUFFS, RARITY_META } from "../buffs";

/**
 * The charm shelf: shows the player's owned buffs as glyph chips (with a
 * hover tooltip explaining each), padded out to {@link MAX_BUFFS} slots so
 * the player can see how much room is left.
 */
export function BuffTray({ buffs }: { buffs: string[] }) {
    return (
        <div className="flex items-center gap-1.5">
            <Sparkles className="size-3.5 shrink-0 text-fuchsia-300/80" />
            <div className="flex items-center gap-1">
                {Array.from({ length: MAX_BUFFS }).map((_, i) => {
                    const id = buffs[i];
                    const def = id ? BUFFS[id] : undefined;
                    if (!def) {
                        return (
                            <div
                                key={`empty-${i}`}
                                className="size-7 rounded-md border border-dashed border-white/10 bg-slate-950/40"
                            />
                        );
                    }
                    const meta = RARITY_META[def.rarity];
                    return (
                        <Tooltip key={def.id}>
                            <TooltipTrigger asChild>
                                <div
                                    className={cn(
                                        "flex size-7 items-center justify-center rounded-md bg-slate-800/80 text-base font-bold ring-1 transition-transform hover:scale-110",
                                        meta.ring,
                                        meta.text,
                                    )}
                                >
                                    {def.glyph}
                                </div>
                            </TooltipTrigger>
                            <TooltipContent
                                side="bottom"
                                className="max-w-56 bg-slate-900 text-slate-100 ring-1 ring-white/10"
                            >
                                <div className="flex items-center justify-between gap-2">
                                    <span className={cn("font-bold", meta.text)}>
                                        {def.name}
                                    </span>
                                    <span className="text-[10px] uppercase tracking-wide text-slate-400">
                                        {meta.label}
                                    </span>
                                </div>
                                <p className="mt-1 text-[11px] leading-snug text-slate-300">
                                    {def.desc}
                                </p>
                            </TooltipContent>
                        </Tooltip>
                    );
                })}
            </div>
        </div>
    );
}
