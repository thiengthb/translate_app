import { useState } from "react";
import {
    BarChart3,
    Bookmark,
    BookmarkPlus,
    Check,
    Columns3,
    Eye,
    LayoutGrid,
    Rows2,
    Rows3,
    Rows4,
    Table2,
    Trash2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
    DropdownMenuSeparator,
    DropdownMenuSub,
    DropdownMenuSubContent,
    DropdownMenuSubTrigger,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TooltipWrapper } from "@/components/datatable/common/TooltipWrapper";
import type { Density } from "@/components/datatable/hook/useDensity";
import {
    useSavedViews,
    type SavedView,
} from "@/components/datatable/hook/useSavedViews";
export type ViewMode = "table" | "card" | "chart";

interface DisplayOptionsMenuProps {
    schema: any;
    columnVisibility: Record<string, boolean>;
    toggleFieldVisibility: (name: string, value: boolean) => void;
    viewMode?: ViewMode;
    onViewModeChange?: (mode: ViewMode) => void;
    density?: Density;
    onDensityChange?: (density: Density) => void;
    entityName?: string;
    savedViewState?: SavedView["state"];
    onApplyView?: (state: SavedView["state"]) => void;
    /** Catalog mode — suppress the view-mode picker since the viewer
     *  is locked to card view (their permissions don't justify the
     *  table or chart density). */
    readOnly?: boolean;
}

const VIEW_MODES: {
    value: ViewMode;
    label: string;
    icon: React.ComponentType<{ size?: number }>;
}[] = [
    { value: "table", label: "Bảng", icon: Table2 },
    { value: "card", label: "Thẻ", icon: LayoutGrid },
    { value: "chart", label: "Biểu đồ", icon: BarChart3 },
];

const DENSITIES: {
    value: Density;
    label: string;
    icon: React.ComponentType<{ size?: number }>;
}[] = [
    { value: "compact", label: "Compact", icon: Rows4 },
    { value: "normal", label: "Normal", icon: Rows3 },
    { value: "comfortable", label: "Comfortable", icon: Rows2 },
];

export function DisplayOptionsMenu({
    schema,
    columnVisibility,
    toggleFieldVisibility,
    viewMode,
    onViewModeChange,
    density,
    onDensityChange,
    entityName,
    savedViewState,
    onApplyView,
    readOnly = false,
}: DisplayOptionsMenuProps) {
    const hideableFields = schema.fields.filter(
        (f: any) => f.hideable !== false,
    );
    // View mode picker is suppressed in catalog mode — the viewer is
    // locked to cards by design, so showing a picker that does nothing
    // (or worse, lies about what they can switch to) is bad UX.
    const showViewMode = !readOnly && !!onViewModeChange;
    const showDensity = !!density && !!onDensityChange;
    const showColumns = hideableFields.length > 0;
    const showSavedViews = !!entityName && !!onApplyView;

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <div>
                    <TooltipWrapper content="Tùy chọn hiển thị">
                        <Button
                            variant="secondary"
                            size="icon"
                            className="h-9 w-9"
                            aria-label="Display options"
                        >
                            <Eye size={15} />
                        </Button>
                    </TooltipWrapper>
                </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
                {showColumns && (
                    <ColumnsSubMenu
                        fields={hideableFields}
                        columnVisibility={columnVisibility}
                        toggleFieldVisibility={toggleFieldVisibility}
                    />
                )}

                {showDensity && (
                    <DensitySubMenu
                        density={density!}
                        onChange={onDensityChange!}
                    />
                )}

                {showSavedViews && (
                    <SavedViewsSubMenu
                        entityName={entityName!}
                        currentState={savedViewState ?? {}}
                        onApply={onApplyView!}
                    />
                )}

                {showViewMode && (
                    <ViewModeSection
                        mode={viewMode ?? "table"}
                        onChange={onViewModeChange!}
                    />
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

function ColumnsSubMenu({
    fields,
    columnVisibility,
    toggleFieldVisibility,
}: {
    fields: any[];
    columnVisibility: Record<string, boolean>;
    toggleFieldVisibility: (name: string, value: boolean) => void;
}) {
    return (
        <DropdownMenuSub>
            <DropdownMenuSubTrigger className="gap-2 text-sm">
                <Columns3 size={14} />
                <span>Hiển thị cột</span>
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="w-56 max-h-80 overflow-y-auto">
                <DropdownMenuLabel className="text-xs">
                    Hiện / ẩn cột
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {fields.map((field: any) => (
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
            </DropdownMenuSubContent>
        </DropdownMenuSub>
    );
}

function DensitySubMenu({
    density,
    onChange,
}: {
    density: Density;
    onChange: (d: Density) => void;
}) {
    const current = DENSITIES.find((o) => o.value === density) ?? DENSITIES[1];
    const CurrentIcon = current.icon;

    return (
        <DropdownMenuSub>
            <DropdownMenuSubTrigger className="gap-2 text-sm">
                <CurrentIcon size={14} />
                <span>Mật độ hiển thị</span>
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
                <DropdownMenuLabel className="text-xs">
                    Mật độ hiển thị
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {DENSITIES.map((opt) => {
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
                            {isActive && (
                                <Check size={13} className="text-primary" />
                            )}
                        </DropdownMenuItem>
                    );
                })}
            </DropdownMenuSubContent>
        </DropdownMenuSub>
    );
}

function SavedViewsSubMenu({
    entityName,
    currentState,
    onApply,
}: {
    entityName: string;
    currentState: SavedView["state"];
    onApply: (state: SavedView["state"]) => void;
}) {
    const { views, save, remove } = useSavedViews(entityName);
    const [naming, setNaming] = useState(false);
    const [name, setName] = useState("");

    const handleSave = () => {
        const finalName = name.trim();
        if (!finalName) return;
        save(finalName, currentState);
        setName("");
        setNaming(false);
    };

    return (
        <DropdownMenuSub>
            <DropdownMenuSubTrigger className="gap-2 text-sm">
                <Bookmark size={14} />
                <span className="flex-1">View đã lưu</span>
                {views.length > 0 && (
                    <span className="text-[10px] text-muted-foreground tabular-nums">
                        {views.length}
                    </span>
                )}
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="w-64">
                <DropdownMenuLabel className="text-xs">
                    View đã lưu
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {views.length === 0 ? (
                    <div className="px-2 py-3 text-xs text-muted-foreground text-center">
                        Chưa có view nào được lưu.
                    </div>
                ) : (
                    <div className="max-h-60 overflow-y-auto">
                        {views.map((v) => (
                            <ViewRow
                                key={v.id}
                                view={v}
                                onApply={() => onApply(v.state)}
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
            </DropdownMenuSubContent>
        </DropdownMenuSub>
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

function ViewModeSection({
    mode,
    onChange,
}: {
    mode: ViewMode;
    onChange: (m: ViewMode) => void;
}) {
    return (
        <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-xs">
                Chế độ xem
            </DropdownMenuLabel>
            <DropdownMenuRadioGroup
                value={mode}
                onValueChange={(v) => onChange(v as ViewMode)}
            >
                {VIEW_MODES.map((m) => {
                    const Icon = m.icon;
                    return (
                        <DropdownMenuRadioItem
                            key={m.value}
                            value={m.value}
                            className="gap-2 text-sm"
                        >
                            <Icon size={14} />
                            {m.label}
                        </DropdownMenuRadioItem>
                    );
                })}
            </DropdownMenuRadioGroup>
        </>
    );
}
