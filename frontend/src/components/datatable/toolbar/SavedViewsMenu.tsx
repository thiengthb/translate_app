import { useState } from "react";
import { Bookmark, BookmarkPlus, Check, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TooltipWrapper } from "@/components/datatable/common/TooltipWrapper";
import { useSavedViews, type SavedView } from "@/components/datatable/hook/useSavedViews";

interface SavedViewsMenuProps {
    entityName: string;
    /** Current state to snapshot when user clicks "Save current". */
    currentState: SavedView["state"];
    /** Called when user picks a view from the list — apply it. */
    onApply: (state: SavedView["state"]) => void;
}

export function SavedViewsMenu({ entityName, currentState, onApply }: SavedViewsMenuProps) {
    const { views, save, remove } = useSavedViews(entityName);
    const [open, setOpen] = useState(false);
    const [naming, setNaming] = useState(false);
    const [name, setName] = useState("");

    const handleSave = () => {
        const finalName = name.trim();
        if (!finalName) return;
        save(finalName, currentState);
        setName("");
        setNaming(false);
        setOpen(false);
    };

    return (
        <DropdownMenu open={open} onOpenChange={setOpen}>
            <DropdownMenuTrigger asChild>
                <div>
                    <TooltipWrapper content="View đã lưu">
                        <Button
                            variant="outline"
                            size="icon"
                            className="h-9 w-9 relative"
                            aria-label="Saved views"
                        >
                            <Bookmark size={15} />
                            {views.length > 0 && (
                                <Badge
                                    variant="secondary"
                                    className="absolute -top-1.5 -right-1.5 h-4 min-w-4 px-1 text-[10px] rounded-full ring-2 ring-background"
                                >
                                    {views.length}
                                </Badge>
                            )}
                        </Button>
                    </TooltipWrapper>
                </div>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="start" className="w-64">
                <DropdownMenuLabel className="flex items-center justify-between">
                    <span className="text-xs">Saved views</span>
                </DropdownMenuLabel>

                {views.length === 0 ? (
                    <div className="px-2 py-3 text-xs text-muted-foreground text-center">
                        Chưa có view nào được lưu.
                    </div>
                ) : (
                    <div className="max-h-72 overflow-y-auto">
                        {views.map((v) => (
                            <ViewRow
                                key={v.id}
                                view={v}
                                onApply={() => {
                                    onApply(v.state);
                                    setOpen(false);
                                }}
                                onRemove={() => remove(v.id)}
                            />
                        ))}
                    </div>
                )}

                <DropdownMenuSeparator />

                {naming ? (
                    <div className="p-2 flex gap-1.5">
                        <Input
                            autoFocus
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter") handleSave();
                                if (e.key === "Escape") {
                                    setNaming(false);
                                    setName("");
                                }
                            }}
                            placeholder="Tên view…"
                            className="h-8 text-xs"
                        />
                        <Button
                            size="sm"
                            onClick={handleSave}
                            disabled={!name.trim()}
                            className="h-8 px-2 shrink-0"
                        >
                            <Check size={14} />
                        </Button>
                    </div>
                ) : (
                    <DropdownMenuItem
                        onSelect={(e) => {
                            e.preventDefault();
                            setNaming(true);
                        }}
                        className="gap-2 text-sm"
                    >
                        <BookmarkPlus size={14} className="text-primary" />
                        Lưu view hiện tại
                    </DropdownMenuItem>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

function ViewRow({
    view,
    onApply,
    onRemove,
}: {
    view: SavedView;
    onApply: () => void;
    onRemove: () => void;
}) {
    return (
        <div className="flex items-center px-1.5 py-1 group hover:bg-accent rounded-sm cursor-pointer">
            <button
                type="button"
                onClick={onApply}
                className="flex-1 text-left text-sm px-2 py-1 min-w-0 cursor-pointer"
            >
                <div className="truncate">{view.name}</div>
            </button>
            <button
                type="button"
                onClick={(e) => {
                    e.stopPropagation();
                    onRemove();
                }}
                className="opacity-0 group-hover:opacity-100 p-1.5 rounded text-muted-foreground hover:text-rose-600 hover:bg-rose-500/10 cursor-pointer transition-opacity"
                aria-label={`Delete ${view.name}`}
            >
                <Trash2 size={13} />
            </button>
        </div>
    );
}
