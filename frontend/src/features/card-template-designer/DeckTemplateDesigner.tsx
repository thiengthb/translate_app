import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  type DragEndEvent,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { motion } from "motion/react";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  ChevronDown,
  ChevronUp,
  Code2,
  Columns2,
  GripVertical,
  Image as ImageIcon,
  Italic,
  Loader2,
  Maximize,
  Mic,
  PanelLeft,
  PanelRight,
  PanelTop,
  Plus,
  RotateCcw,
  Rows3,
  Save,
  Type,
  Underline,
  Video,
  X,
} from "lucide-react";
import { useMemo, useState, type PointerEvent } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { DEFAULT_CUSTOM_COLORS } from "./presets";
import type {
  AvailableTemplateField,
  CardTemplateBlock,
  CardTemplateBuilderState,
  CardTemplateSettings,
  FontFamilyKey,
  FuriganaMode,
  TemplateLayoutMode,
  TemplateSide,
} from "./types";

export interface TemplateDraftFields {
  name: string;
  description: string;
  frontTemplate: string;
  backTemplate: string;
  styling: string;
}

interface DeckTemplateDesignerProps {
  deckTitle?: string;
  draft: TemplateDraftFields;
  builderState: CardTemplateBuilderState;
  availableFields: AvailableTemplateField[];
  previewSide: TemplateSide;
  previewSrcDoc: string;
  advancedMode: boolean;
  customCode: boolean;
  saving: boolean;
  removing: boolean;
  hasTemplate: boolean;
  hasSampleCard: boolean;
  onDraftChange: (draft: TemplateDraftFields) => void;
  onBuilderChange: (state: CardTemplateBuilderState) => void;
  onPreviewSideChange: (side: TemplateSide) => void;
  onAdvancedModeChange: (enabled: boolean) => void;
  onCustomCodeChange: (enabled: boolean) => void;
  onSave: () => void;
  onCancel: () => void;
  onRemoveTemplate: () => void;
}

const LAYOUT_OPTIONS: Array<{ value: TemplateLayoutMode; label: string; icon: typeof AlignCenter }> = [
  { value: "CENTER", label: "Centered", icon: AlignCenter },
  { value: "LEFT", label: "Left", icon: AlignLeft },
  { value: "RIGHT", label: "Right", icon: AlignRight },
  { value: "STACKED", label: "Stacked", icon: Rows3 },
  { value: "TWO_COLUMNS", label: "Two columns", icon: Columns2 },
  { value: "IMAGE_TOP", label: "Image top", icon: PanelTop },
  { value: "IMAGE_LEFT", label: "Image left", icon: PanelLeft },
  { value: "IMAGE_RIGHT", label: "Image right", icon: PanelRight },
  { value: "COMPACT", label: "Compact", icon: ImageIcon },
  { value: "FOCUS", label: "Focus", icon: Maximize },
];

const FONT_OPTIONS: Array<{ value: FontFamilyKey; label: string }> = [
  { value: "SANS", label: "Sans-serif" },
  { value: "SERIF", label: "Serif" },
  { value: "ROUNDED", label: "Rounded" },
  { value: "MONO", label: "Monospace" },
  { value: "JP_GOTHIC", label: "Japanese Gothic (ゴシック)" },
  { value: "JP_MINCHO", label: "Japanese Mincho (明朝)" },
];

const COLOR_SWATCHES = [
  "#1f2937", "#dc2626", "#ea580c", "#d97706", "#16a34a",
  "#0891b2", "#2563eb", "#7c3aed", "#db2777", "#ffffff",
];

/* ─────────────────────────────────────────
   Main component
───────────────────────────────────────── */
export function DeckTemplateDesigner({
  deckTitle,
  draft,
  builderState,
  availableFields,
  previewSide,
  previewSrcDoc,
  advancedMode,
  customCode,
  saving,
  removing,
  hasTemplate,
  hasSampleCard,
  onDraftChange,
  onBuilderChange,
  onPreviewSideChange,
  onAdvancedModeChange,
  onCustomCodeChange,
  onSave,
  onCancel,
  onRemoveTemplate,
}: DeckTemplateDesignerProps) {
  const [activeSide, setActiveSide] = useState<TemplateSide>("FRONT");

  const updateSide = (side: TemplateSide, blocks: CardTemplateBlock[]) => {
    onBuilderChange({
      ...builderState,
      sides: { ...builderState.sides, [side]: blocks },
    });
  };

  const updateSettings = (next: Partial<CardTemplateSettings>) => {
    onBuilderChange({
      ...builderState,
      settings: { ...builderState.settings, ...next },
    });
  };

  return (
    <div className="flex h-[92vh] flex-col bg-background text-foreground">
      {/* ════════ HEADER ════════ */}
      <header className="flex items-center justify-between gap-3 border-b border-border bg-card px-5 py-3 shrink-0">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold tracking-tight">Card template</h2>
            {customCode && (
              <Badge variant="outline" className="border-amber-400 bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
                <Code2 className="size-3 mr-1" />
                Custom code
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5 truncate">
            {deckTitle ? `Applies to every card in "${deckTitle}".` : "Applies to every card in this deck."}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {hasTemplate && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRemoveTemplate}
              disabled={saving || removing}
              title="Remove this template and fall back to the default card layout"
            >
              {removing ? <Loader2 className="size-3.5 animate-spin" /> : <RotateCcw className="size-3.5" />}
              Back to default
            </Button>
          )}
          <Button variant="ghost" onClick={onCancel} disabled={saving || removing}>
            <X className="size-4 mr-1" />
            Cancel
          </Button>
          <Button onClick={onSave} disabled={saving || removing}>
            {saving ? <Loader2 className="size-4 animate-spin mr-1" /> : <Save className="size-4 mr-1" />}
            Save template
          </Button>
        </div>
      </header>

      {/* ════════ BODY ════════ */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* ───── Left: scrollable editor ───── */}
        <div className="flex-1 min-w-0 overflow-y-auto bg-muted/30">
          <div className="space-y-4 p-5 max-w-3xl mx-auto">
            <TemplateBasics draft={draft} onDraftChange={onDraftChange} />

            <CardBuilderPanel
              activeSide={activeSide}
              state={builderState}
              availableFields={availableFields}
              onSideChange={setActiveSide}
              onSideBlocksChange={(side, blocks) => {
                updateSide(side, blocks);
                onCustomCodeChange(false);
              }}
            />

            <LayoutPanel settings={builderState.settings} onChange={updateSettings} />
            <TypographyPanel settings={builderState.settings} onChange={updateSettings} />
            <JapaneseMediaPanel settings={builderState.settings} onChange={updateSettings} />

            <AdvancedPanel
              advancedMode={advancedMode}
              onAdvancedModeChange={onAdvancedModeChange}
              draft={draft}
              onDraftChange={(next) => {
                onDraftChange(next);
                onCustomCodeChange(true);
              }}
            />
          </div>
        </div>

        {/* ───── Right: fixed preview ───── */}
        <aside className="w-110 xl:w-130 shrink-0 border-l border-border bg-card flex flex-col">
          <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-border shrink-0">
            <div>
              <h3 className="text-sm font-semibold">Live preview</h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {hasSampleCard
                  ? "Showing a real card from this deck."
                  : "Add a card to this deck to see real content."}
              </p>
            </div>
            <Tabs value={previewSide} onValueChange={(value) => onPreviewSideChange(value as TemplateSide)}>
              <TabsList className="h-8">
                <TabsTrigger value="FRONT" className="h-7 px-3 text-xs">Front</TabsTrigger>
                <TabsTrigger value="BACK" className="h-7 px-3 text-xs">Back</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <div className="flex-1 p-4 min-h-0">
            <iframe
              title="Template preview"
              sandbox="allow-same-origin"
              srcDoc={previewSrcDoc}
              className="w-full h-full rounded-lg border border-border bg-background"
            />
          </div>
        </aside>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────
   Collapsible section shell
───────────────────────────────────────── */
function Section({
  title,
  description,
  children,
  defaultOpen = true,
  rightSlot,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  rightSlot?: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
      <div className="flex items-center justify-between gap-2 px-4 py-3">
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="flex flex-1 items-center justify-between gap-3 text-left"
        >
          <div>
            <h3 className="text-sm font-semibold">{title}</h3>
            {description && <p className="text-[11px] text-muted-foreground mt-0.5">{description}</p>}
          </div>
          {open ? <ChevronUp className="size-4 text-muted-foreground" /> : <ChevronDown className="size-4 text-muted-foreground" />}
        </button>
        {rightSlot}
      </div>
      {open && <div className="px-4 pb-4">{children}</div>}
    </section>
  );
}

function TemplateBasics({
  draft,
  onDraftChange,
}: {
  draft: TemplateDraftFields;
  onDraftChange: (draft: TemplateDraftFields) => void;
}) {
  return (
    <Section title="Template details" description="Name and description for this template.">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="template-name">Name</Label>
          <Input
            id="template-name"
            value={draft.name}
            onChange={(event) => onDraftChange({ ...draft, name: event.target.value })}
            placeholder="e.g. Vocabulary template"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="template-description">Description</Label>
          <Input
            id="template-description"
            value={draft.description}
            onChange={(event) => onDraftChange({ ...draft, description: event.target.value })}
            placeholder="Optional"
          />
        </div>
      </div>
    </Section>
  );
}

/* ─────────────────────────────────────────
   Card builder — fields on the current side + add from deck fields
───────────────────────────────────────── */
function CardBuilderPanel({
  activeSide,
  state,
  availableFields,
  onSideChange,
  onSideBlocksChange,
}: {
  activeSide: TemplateSide;
  state: CardTemplateBuilderState;
  availableFields: AvailableTemplateField[];
  onSideChange: (side: TemplateSide) => void;
  onSideBlocksChange: (side: TemplateSide, blocks: CardTemplateBlock[]) => void;
}) {
  const blocks = state.sides[activeSide];
  const enabledCount = blocks.filter((block) => block.enabled).length;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // Keep every field visible even if it is already used. Users may add the
  // same label multiple times to build repeated layouts.
  const sideFields = useMemo(() => {
    return availableFields.filter((field) => field.side === activeSide);
  }, [availableFields, activeSide]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = blocks.findIndex((block) => block.id === active.id);
    const newIndex = blocks.findIndex((block) => block.id === over.id);
    onSideBlocksChange(activeSide, arrayMove(blocks, oldIndex, newIndex));
  };

  const updateBlock = (id: string, patch: Partial<CardTemplateBlock>) => {
    onSideBlocksChange(
      activeSide,
      blocks.map((block) => (block.id === id ? { ...block, ...patch } : block))
    );
  };

  const removeBlock = (id: string) => {
    onSideBlocksChange(activeSide, blocks.filter((block) => block.id !== id));
  };

  const addField = (field: AvailableTemplateField) => {
    const newBlock: CardTemplateBlock = {
      id: `block-${activeSide.toLowerCase()}-${field.name}-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 8)}`,
      side: activeSide,
      fieldName: field.name,
      contentType: field.contentType,
      label: field.label,
      enabled: true,
      size: blocks.length === 0 ? "primary" : "secondary",
      showLabel: false,
    };
    onSideBlocksChange(activeSide, [...blocks, newBlock]);
  };

  return (
    <Section
      title="Card builder"
      description="Toggle, reorder and resize the fields shown on this side."
    >
      <div className="flex items-center justify-between mb-3">
        <Tabs value={activeSide} onValueChange={(value) => onSideChange(value as TemplateSide)}>
          <TabsList className="h-8">
            <TabsTrigger value="FRONT" className="h-7 px-3 text-xs">
              Front · {state.sides.FRONT.filter((b) => b.enabled).length}/{state.sides.FRONT.length}
            </TabsTrigger>
            <TabsTrigger value="BACK" className="h-7 px-3 text-xs">
              Back · {state.sides.BACK.filter((b) => b.enabled).length}/{state.sides.BACK.length}
            </TabsTrigger>
          </TabsList>
        </Tabs>
        <span className="text-[11px] text-muted-foreground">
          {enabledCount} of {blocks.length} visible
        </span>
      </div>

      {blocks.length === 0 && (
        <div className="rounded-lg border border-dashed border-border bg-muted/30 px-4 py-6 text-center text-sm text-muted-foreground mb-3">
          No fields on this side yet. Pick one from the deck fields below.
        </div>
      )}

      {blocks.length > 0 && (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={blocks.map((block) => block.id)} strategy={verticalListSortingStrategy}>
            <div className="mb-3 max-h-[343px] space-y-2 overflow-y-auto pr-1">
              {blocks.map((block, index) => (
                <SortableFieldBlock
                  key={block.id}
                  block={block}
                  onUpdate={(patch) => updateBlock(block.id, patch)}
                  onRemove={() => removeBlock(block.id)}
                  onMove={(dir) => {
                    const target = index + dir;
                    if (target < 0 || target >= blocks.length) return;
                    onSideBlocksChange(activeSide, arrayMove(blocks, index, target));
                  }}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {/* Available deck fields → click to add */}
      <div className="rounded-lg border border-dashed border-border bg-muted/20 p-3">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">
          Deck fields · click to add
        </p>
        {sideFields.length === 0 ? (
          <p className="text-[11px] text-muted-foreground">
            No {activeSide.toLowerCase()} fields found in the sample card.
          </p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {sideFields.map((field) => {
              const Icon = iconForContent(field.contentType);
              const usedCount = blocks.filter((block) => block.fieldName === field.name).length;
              return (
                <button
                  key={`${field.side}-${field.name}`}
                  type="button"
                  onClick={() => addField(field)}
                  title={`${field.contentType} · ${field.preview}`}
                  className="group inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs transition-colors hover:border-primary/50 hover:bg-primary/5"
                >
                  <Icon className="size-3.5 text-muted-foreground group-hover:text-primary" />
                  <span className="font-medium">{field.label}</span>
                  {usedCount > 0 && (
                    <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                      {usedCount}x
                    </span>
                  )}
                  <Plus className="size-3 text-muted-foreground group-hover:text-primary" />
                </button>
              );
            })}
          </div>
        )}
      </div>
    </Section>
  );
}

function SortableFieldBlock({
  block,
  onUpdate,
  onRemove,
  onMove,
}: {
  block: CardTemplateBlock;
  onUpdate: (patch: Partial<CardTemplateBlock>) => void;
  onRemove: () => void;
  onMove: (direction: -1 | 1) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: block.id,
  });
  const Icon = iconForContent(block.contentType);
  const stopDragPropagation = (event: PointerEvent<HTMLElement>) => {
    event.stopPropagation();
  };

  return (
    <motion.div
      ref={setNodeRef}
      layout
      {...attributes}
      {...listeners}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "cursor-grab rounded-lg border border-border bg-card p-3 shadow-sm transition-opacity active:cursor-grabbing",
        !block.enabled && "opacity-60",
        isDragging && "z-10 shadow-lg ring-2 ring-primary/30"
      )}
    >
      <div className="flex items-start gap-2">
        <button
          type="button"
          className="mt-1 text-muted-foreground hover:text-foreground"
          aria-label="Drag to reorder"
        >
          <GripVertical className="size-4" />
        </button>

        <Icon className="mt-1 size-4 text-primary shrink-0" />

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{block.label}</p>
              <p className="truncate text-[11px] text-muted-foreground font-mono">
                {"{{"}{block.fieldName}{"}}"} · {block.contentType.toLowerCase()}
              </p>
            </div>
            <div onPointerDown={stopDragPropagation}>
              <Switch
                checked={block.enabled}
                onCheckedChange={(enabled) => onUpdate({ enabled })}
                aria-label="Show this field"
              />
            </div>
          </div>

          <div className="mt-2.5 grid grid-cols-[1fr_auto_auto_auto] gap-2 items-center">
            <div onPointerDown={stopDragPropagation}>
              <Select value={block.size} onValueChange={(size) => onUpdate({ size: size as CardTemplateBlock["size"] })}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="primary">Large</SelectItem>
                  <SelectItem value="secondary">Normal</SelectItem>
                  <SelectItem value="caption">Small</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <label
              className="flex items-center gap-1.5 text-[11px] text-muted-foreground cursor-pointer"
              onPointerDown={stopDragPropagation}
            >
              <Switch
                checked={block.showLabel}
                onCheckedChange={(showLabel) => onUpdate({ showLabel })}
                aria-label="Show label above value"
              />
              Label
            </label>

            <div className="flex gap-1" onPointerDown={stopDragPropagation}>
              <Button variant="ghost" size="sm" className="size-7 p-0" onClick={() => onMove(-1)} title="Move up">
                <ChevronUp className="size-3.5" />
              </Button>
              <Button variant="ghost" size="sm" className="size-7 p-0" onClick={() => onMove(1)} title="Move down">
                <ChevronDown className="size-3.5" />
              </Button>
            </div>

            <Button
              variant="ghost"
              size="sm"
              className="size-7 p-0 text-muted-foreground hover:text-destructive"
              onClick={onRemove}
              onPointerDown={stopDragPropagation}
              title="Remove field"
            >
              <X className="size-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/* ─────────────────────────────────────────
   Layout panel — Word-like options
───────────────────────────────────────── */
function LayoutPanel({
  settings,
  onChange,
}: {
  settings: CardTemplateSettings;
  onChange: (next: Partial<CardTemplateSettings>) => void;
}) {
  return (
    <Section title="Layout" description="How fields are arranged on the card.">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
        {LAYOUT_OPTIONS.map((option) => {
          const Icon = option.icon;
          const active = settings.layout.mode === option.value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange({ layout: { ...settings.layout, mode: option.value } })}
              className={cn(
                "flex flex-col items-center gap-1.5 rounded-lg border px-2 py-2.5 text-[11px] transition-colors",
                active
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-background hover:bg-accent"
              )}
            >
              <Icon className="size-4" />
              {option.label}
            </button>
          );
        })}
      </div>

      <div className="mt-4 space-y-1.5">
        <Label className="text-sm">Spacing</Label>
        <SegmentedControl
          value={settings.layout.spacing}
          options={[
            { value: "compact", label: "Compact" },
            { value: "comfortable", label: "Comfortable" },
            { value: "roomy", label: "Roomy" },
          ]}
          onChange={(spacing) =>
            onChange({ layout: { ...settings.layout, spacing: spacing as CardTemplateSettings["layout"]["spacing"] } })
          }
        />
      </div>
    </Section>
  );
}

/* ─────────────────────────────────────────
   Typography panel — font family, B/I/U, color, sliders
───────────────────────────────────────── */
function TypographyPanel({
  settings,
  onChange,
}: {
  settings: CardTemplateSettings;
  onChange: (next: Partial<CardTemplateSettings>) => void;
}) {
  const t = settings.typography;
  const patch = (next: Partial<CardTemplateSettings["typography"]>) =>
    onChange({ typography: { ...t, ...next } });

  return (
    <Section title="Typography" description="Fonts, weight and text styling.">
      <div className="space-y-4">
        {/* Font family */}
        <div className="space-y-1.5">
          <Label className="text-sm">Font</Label>
          <Select value={t.fontFamily} onValueChange={(value) => patch({ fontFamily: value as FontFamilyKey })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FONT_OPTIONS.map((font) => (
                <SelectItem key={font.value} value={font.value}>
                  {font.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Style toolbar: B / I / U */}
        <div className="space-y-1.5">
          <Label className="text-sm">Style</Label>
          <div className="flex items-center gap-1.5">
            <ToggleButton
              active={t.fontWeight >= 700}
              onClick={() => patch({ fontWeight: t.fontWeight >= 700 ? 500 : 700 })}
              title="Bold"
            >
              <Bold className="size-4" />
            </ToggleButton>
            <ToggleButton active={t.italic} onClick={() => patch({ italic: !t.italic })} title="Italic">
              <Italic className="size-4" />
            </ToggleButton>
            <ToggleButton active={t.underline} onClick={() => patch({ underline: !t.underline })} title="Underline">
              <Underline className="size-4" />
            </ToggleButton>
            <ToggleButton
              active={t.uppercase}
              onClick={() => patch({ uppercase: !t.uppercase })}
              title="Uppercase"
            >
              <span className="text-xs font-bold">AA</span>
            </ToggleButton>
          </div>
        </div>

        {/* Text color */}
        <div className="space-y-1.5">
          <ColorField
            label="Text color"
            value={t.textColor ?? DEFAULT_CUSTOM_COLORS.text}
            onChange={(color) => patch({ textColor: color })}
          />
          {t.textColor && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-[11px]"
              onClick={() => patch({ textColor: null })}
              title="Use default color"
            >
              <RotateCcw className="size-3 mr-1" />
              Reset to default
            </Button>
          )}
        </div>

        <RangeRow label="Font size" value={t.fontSize} min={14} max={48} unit="px" onChange={(fontSize) => patch({ fontSize })} />
        <RangeRow label="Font weight" value={t.fontWeight} min={300} max={900} step={100} onChange={(fontWeight) => patch({ fontWeight })} />
        <RangeRow label="Line height" value={t.lineHeight} min={1.1} max={2.2} step={0.05} onChange={(lineHeight) => patch({ lineHeight })} />
        <RangeRow label="Letter spacing" value={t.letterSpacing} min={-1} max={6} step={0.5} unit="px" onChange={(letterSpacing) => patch({ letterSpacing })} />
      </div>
    </Section>
  );
}

/* ─────────────────────────────────────────
   Japanese + media
───────────────────────────────────────── */
function JapaneseMediaPanel({
  settings,
  onChange,
}: {
  settings: CardTemplateSettings;
  onChange: (next: Partial<CardTemplateSettings>) => void;
}) {
  return (
    <Section title="Japanese & media" defaultOpen={false}>
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label className="text-sm">Furigana</Label>
          <Select
            value={settings.japanese.furiganaMode}
            onValueChange={(value) =>
              onChange({ japanese: { ...settings.japanese, furiganaMode: value as FuriganaMode } })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="SHOW">Always show</SelectItem>
              <SelectItem value="HIDE">Hide</SelectItem>
              <SelectItem value="HOVER">Show on hover</SelectItem>
              <SelectItem value="TOGGLE">Toggle-ready</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <ToggleRow label="Auto-play audio" checked={settings.media.autoPlayAudio} onChange={(autoPlayAudio) => onChange({ media: { ...settings.media, autoPlayAudio } })} />
        <ToggleRow label="Show audio button" checked={settings.media.showAudioButton} onChange={(showAudioButton) => onChange({ media: { ...settings.media, showAudioButton } })} />
        <ToggleRow label="Show image" checked={settings.media.showImage} onChange={(showImage) => onChange({ media: { ...settings.media, showImage } })} />
        <ToggleRow label="Show video" checked={settings.media.showVideo} onChange={(showVideo) => onChange({ media: { ...settings.media, showVideo } })} />
      </div>
    </Section>
  );
}

/* ─────────────────────────────────────────
   Advanced HTML/CSS editor
───────────────────────────────────────── */
function AdvancedPanel({
  advancedMode,
  onAdvancedModeChange,
  draft,
  onDraftChange,
}: {
  advancedMode: boolean;
  onAdvancedModeChange: (enabled: boolean) => void;
  draft: TemplateDraftFields;
  onDraftChange: (next: TemplateDraftFields) => void;
}) {
  const [tab, setTab] = useState<"front" | "back" | "css">("front");

  return (
    <Section
      title="Advanced (HTML / CSS)"
      description="Editing here marks the template as custom code."
      defaultOpen={false}
      rightSlot={
        <Switch
          checked={advancedMode}
          onCheckedChange={(checked) => {
            if (
              checked &&
              !window.confirm(
                "Editing HTML/CSS manually may make the Visual Builder out of sync. Continue?"
              )
            ) {
              return;
            }
            onAdvancedModeChange(checked);
          }}
        />
      }
    >
      {advancedMode ? (
        <div className="space-y-3">
          <Tabs value={tab} onValueChange={(value) => setTab(value as "front" | "back" | "css")}>
            <TabsList className="w-full">
              <TabsTrigger value="front" className="flex-1">Front HTML</TabsTrigger>
              <TabsTrigger value="back" className="flex-1">Back HTML</TabsTrigger>
              <TabsTrigger value="css" className="flex-1">CSS</TabsTrigger>
            </TabsList>
          </Tabs>

          {tab === "front" && (
            <Textarea
              value={draft.frontTemplate}
              onChange={(event) => onDraftChange({ ...draft, frontTemplate: event.target.value })}
              rows={10}
              spellCheck={false}
              className="font-mono text-xs"
            />
          )}
          {tab === "back" && (
            <Textarea
              value={draft.backTemplate}
              onChange={(event) => onDraftChange({ ...draft, backTemplate: event.target.value })}
              rows={10}
              spellCheck={false}
              className="font-mono text-xs"
            />
          )}
          {tab === "css" && (
            <Textarea
              value={draft.styling}
              onChange={(event) => onDraftChange({ ...draft, styling: event.target.value })}
              rows={10}
              spellCheck={false}
              className="font-mono text-xs"
            />
          )}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">
          Toggle on to override the visual builder with raw HTML/CSS.
        </p>
      )}
    </Section>
  );
}

/* ─────────────────────────────────────────
   Small helpers
───────────────────────────────────────── */
function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: Array<{ value: T; label: string }>;
  onChange: (value: T) => void;
}) {
  return (
    <div className="flex items-center rounded-lg border border-border bg-muted/40 p-0.5">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={cn(
            "flex-1 rounded-md px-2 py-1.5 text-xs font-medium transition-colors",
            value === option.value
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function ToggleButton({
  active,
  onClick,
  title,
  children,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={cn(
        "flex size-8 items-center justify-center rounded-md border transition-colors",
        active
          ? "border-primary bg-primary/10 text-primary"
          : "border-border bg-background text-muted-foreground hover:text-foreground hover:bg-accent"
      )}
    >
      {children}
    </button>
  );
}

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (color: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <div className="flex items-center gap-2">
        <label
          className="relative size-8 shrink-0 cursor-pointer rounded-md border border-border overflow-hidden"
          style={{ background: value }}
        >
          <input
            type="color"
            value={value}
            onChange={(event) => onChange(event.target.value)}
            className="absolute inset-0 cursor-pointer opacity-0"
          />
        </label>
        <Input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="h-8 text-xs font-mono"
        />
      </div>
      <div className="flex flex-wrap gap-1">
        {COLOR_SWATCHES.map((swatch) => (
          <button
            key={swatch}
            type="button"
            onClick={() => onChange(swatch)}
            className="size-4 rounded-sm border border-border"
            style={{ background: swatch }}
            title={swatch}
          />
        ))}
      </div>
    </div>
  );
}

function RangeRow({
  label,
  value,
  min,
  max,
  step = 1,
  unit,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  onChange: (value: number) => void;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label className="text-sm">{label}</Label>
        <span className="text-xs text-muted-foreground tabular-nums">
          {value}
          {unit ?? ""}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="w-full accent-primary"
      />
    </div>
  );
}

function ToggleRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <Label className="text-sm">{label}</Label>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

function iconForContent(contentType: CardTemplateBlock["contentType"]) {
  switch (contentType) {
    case "AUDIO":
      return Mic;
    case "IMAGE":
      return ImageIcon;
    case "VIDEO":
      return Video;
    case "CLOZE":
    case "TEXT":
    default:
      return Type;
  }
}
