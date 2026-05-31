/**
 * Field-based deck authoring shared by the create-deck flow.
 *
 * A deck's cards all share one "structure" (think Anki note type): an ordered
 * list of FIELDS, each with a name, a side it belongs to (FRONT/BACK) and a
 * content type (text / image / audio / video). Every card then carries one
 * value per field, so rich multi-field cards (Word · Reading · Meaning · …)
 * can be authored in bulk instead of edited one-by-one after creation.
 *
 * The same field list later feeds the card-template designer verbatim (fields
 * map 1:1 to `{{Field name}}` tokens), so the structure defined here doubles as
 * the deck's render template.
 */
import { useRef } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  Image as ImageIcon,
  Mic,
  Plus,
  Trash2,
  Type,
  Video,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { parseBuilderConfig } from "@/features/card-template-designer/template-generation";
import type { FlashcardContentType } from "@/types";

/* ─────────────────────────── Types ─────────────────────────── */

export type FieldSide = "FRONT" | "BACK";

/** One field in the deck's shared card structure. */
export interface FieldDef {
  id: string;
  name: string;
  side: FieldSide;
  type: FlashcardContentType;
}

/** A field's value on a single card. */
export interface FieldCellValue {
  text: string;
  /** Pending upload for IMAGE/AUDIO/VIDEO fields. */
  file?: File;
  /** Object-URL preview while a file is pending. */
  preview?: string;
}

/** One card: a value per field, keyed by field id. */
export interface FieldCardDraft {
  uid: string;
  values: Record<string, FieldCellValue>;
}

/* ─────────────────────────── Options ─────────────────────────── */

export const FIELD_TYPES: { value: FlashcardContentType; label: string; icon: React.ReactNode }[] = [
  { value: "TEXT", label: "Văn bản", icon: <Type className="size-3.5" /> },
  { value: "IMAGE", label: "Ảnh", icon: <ImageIcon className="size-3.5" /> },
  { value: "AUDIO", label: "Âm thanh", icon: <Mic className="size-3.5" /> },
  { value: "VIDEO", label: "Video", icon: <Video className="size-3.5" /> },
];

const SIDES: { value: FieldSide; label: string }[] = [
  { value: "FRONT", label: "Mặt trước" },
  { value: "BACK", label: "Mặt sau" },
];

const sideLabel = (s: FieldSide) => SIDES.find((x) => x.value === s)!.label;
const typeMeta = (t: FlashcardContentType) =>
  FIELD_TYPES.find((x) => x.value === t) ?? FIELD_TYPES[0];

/* ─────────────────────────── Factories ─────────────────────────── */

export const makeField = (name: string, side: FieldSide, type: FlashcardContentType = "TEXT"): FieldDef => ({
  id: crypto.randomUUID(),
  name,
  side,
  type,
});

export const makeFieldCard = (fields: FieldDef[]): FieldCardDraft => ({
  uid: crypto.randomUUID(),
  values: Object.fromEntries(fields.map((f) => [f.id, { text: "" }])),
});

/** Ready-made structures so common deck shapes are one click away. */
export const FIELD_PRESETS: { id: string; label: string; build: () => FieldDef[] }[] = [
  {
    id: "basic",
    label: "Cơ bản",
    build: () => [makeField("Mặt trước", "FRONT"), makeField("Mặt sau", "BACK")],
  },
  {
    id: "vocab",
    label: "Từ vựng",
    build: () => [
      makeField("Từ vựng", "FRONT"),
      makeField("Cách đọc", "FRONT"),
      makeField("Nghĩa", "BACK"),
      makeField("Ví dụ", "BACK"),
    ],
  },
  {
    id: "kanji",
    label: "Kanji",
    build: () => [
      makeField("Kanji", "FRONT"),
      makeField("Âm On", "BACK"),
      makeField("Âm Kun", "BACK"),
      makeField("Nghĩa", "BACK"),
    ],
  },
];

/** The default structure for a fresh deck (matches the old front/back flow). */
export const defaultFields = (): FieldDef[] => FIELD_PRESETS[0].build();

/**
 * Recover a field structure from a saved template's builder config so an
 * existing template can be reused to shape a new deck's cards. Returns [] when
 * the config is missing/unparseable (caller should keep its current fields).
 */
export function fieldsFromBuilderConfig(builderConfigJson: string | null | undefined): FieldDef[] {
  const state = parseBuilderConfig(builderConfigJson);
  if (!state) return [];
  const out: FieldDef[] = [];
  for (const side of ["FRONT", "BACK"] as const) {
    for (const block of state.sides[side] ?? []) {
      out.push(makeField(block.fieldName || (side === "FRONT" ? "Mặt trước" : "Mặt sau"), side, block.contentType));
    }
  }
  return out;
}

/* ─────────────── A field cell is "filled" when it has content ─────────────── */
export function cellFilled(v: FieldCellValue | undefined): boolean {
  if (!v) return false;
  return Boolean(v.text.trim() || v.file || v.preview);
}

/* ─────────────────────────── Structure editor ─────────────────────────── */

interface StructureProps {
  fields: FieldDef[];
  onChange: (next: FieldDef[]) => void;
}

export function FieldStructureEditor({ fields, onChange }: StructureProps) {
  const patch = (id: string, p: Partial<FieldDef>) =>
    onChange(fields.map((f) => (f.id === id ? { ...f, ...p } : f)));
  const remove = (id: string) => onChange(fields.filter((f) => f.id !== id));
  const add = (side: FieldSide) =>
    onChange([...fields, makeField(`Trường ${fields.length + 1}`, side)]);

  return (
    <div className="space-y-2">
      <AnimatePresence initial={false}>
        {fields.map((f) => {
          const tm = typeMeta(f.type);
          return (
            <motion.div
              key={f.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97, height: 0, marginBottom: 0 }}
              transition={{ duration: 0.13 }}
              className="flex items-center gap-2"
            >
              <input
                value={f.name}
                onChange={(e) => patch(f.id, { name: e.target.value })}
                placeholder="Tên trường"
                maxLength={60}
                className="h-9 flex-1 min-w-0 rounded-lg border border-input bg-background px-3 text-sm font-medium text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring/40"
              />

              {/* Side picker */}
              <PickerMenu
                label={sideLabel(f.side)}
                className="w-28"
                items={SIDES.map((s) => ({ key: s.value, label: s.label, active: s.value === f.side }))}
                onPick={(key) => patch(f.id, { side: key as FieldSide })}
              />

              {/* Type picker */}
              <PickerMenu
                label={tm.label}
                icon={tm.icon}
                className="w-32"
                items={FIELD_TYPES.map((t) => ({
                  key: t.value,
                  label: t.label,
                  icon: t.icon,
                  active: t.value === f.type,
                }))}
                onPick={(key) => patch(f.id, { type: key as FlashcardContentType })}
              />

              <button
                onClick={() => remove(f.id)}
                disabled={fields.length <= 1}
                title="Xóa trường"
                className="flex size-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-destructive disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <Trash2 className="size-4" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>

      <div className="flex items-center gap-2 pt-0.5">
        <button
          onClick={() => add("FRONT")}
          className="flex items-center gap-1.5 h-8 px-3 rounded-lg border border-dashed border-border text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
        >
          <Plus className="size-3.5" />
          Trường mặt trước
        </button>
        <button
          onClick={() => add("BACK")}
          className="flex items-center gap-1.5 h-8 px-3 rounded-lg border border-dashed border-border text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
        >
          <Plus className="size-3.5" />
          Trường mặt sau
        </button>
      </div>
    </div>
  );
}

/* ─────────────────────────── Card list ─────────────────────────── */

interface CardListProps {
  fields: FieldDef[];
  cards: FieldCardDraft[];
  onChange: (next: FieldCardDraft[]) => void;
  /** Force error state on required-but-empty cells. */
  submitted?: boolean;
}

export function FieldCardList({ fields, cards, onChange, submitted }: CardListProps) {
  const setCell = (uid: string, fieldId: string, v: FieldCellValue) =>
    onChange(cards.map((c) => (c.uid === uid ? { ...c, values: { ...c.values, [fieldId]: v } } : c)));
  const removeCard = (uid: string) => onChange(cards.filter((c) => c.uid !== uid));

  return (
    <ul className="space-y-3">
      <AnimatePresence initial={false}>
        {cards.map((card, i) => (
          <motion.li
            key={card.uid}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, height: 0, marginBottom: 0 }}
            transition={{ duration: 0.15 }}
          >
            <FieldCardEditor
              index={i + 1}
              fields={fields}
              card={card}
              canDelete={cards.length > 1}
              submitted={submitted}
              onCell={(fieldId, v) => setCell(card.uid, fieldId, v)}
              onDelete={() => removeCard(card.uid)}
            />
          </motion.li>
        ))}
      </AnimatePresence>
    </ul>
  );
}

function FieldCardEditor({
  index,
  fields,
  card,
  canDelete,
  submitted,
  onCell,
  onDelete,
}: {
  index: number;
  fields: FieldDef[];
  card: FieldCardDraft;
  canDelete: boolean;
  submitted?: boolean;
  onCell: (fieldId: string, v: FieldCellValue) => void;
  onDelete: () => void;
}) {
  return (
    <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden group">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-muted/30">
        <span className="text-xs font-bold text-muted-foreground">{index}</span>
        <button
          onClick={onDelete}
          disabled={!canDelete}
          title="Xóa thẻ"
          className="p-1.5 rounded text-muted-foreground transition-colors hover:bg-accent hover:text-destructive disabled:opacity-30 disabled:cursor-not-allowed opacity-0 group-hover:opacity-100"
        >
          <Trash2 className="size-4" />
        </button>
      </div>

      {/* Field grid */}
      <div className="grid grid-cols-1 gap-x-5 gap-y-3.5 px-4 py-3.5 sm:grid-cols-2">
        {fields.map((f) => (
          <FieldCell
            key={f.id}
            field={f}
            value={card.values[f.id] ?? { text: "" }}
            // A FRONT/BACK field is required so the card is studyable both ways.
            required={submitted}
            onChange={(v) => onCell(f.id, v)}
          />
        ))}
      </div>
    </div>
  );
}

function FieldCell({
  field,
  value,
  required,
  onChange,
}: {
  field: FieldDef;
  value: FieldCellValue;
  required?: boolean;
  onChange: (v: FieldCellValue) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const isMedia = field.type !== "TEXT";
  const accept =
    field.type === "IMAGE" ? "image/*" : field.type === "AUDIO" ? "audio/*" : field.type === "VIDEO" ? "video/*" : undefined;

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    onChange({ ...value, file, preview: URL.createObjectURL(file) });
    e.target.value = "";
  };

  const showError = required && !cellFilled(value);

  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <div className="flex items-center gap-1.5">
        <span className="text-muted-foreground">{typeMeta(field.type).icon}</span>
        <span className={cn("text-[10px] font-semibold uppercase tracking-widest", showError ? "text-destructive" : "text-muted-foreground")}>
          {field.name || "(chưa đặt tên)"}
        </span>
        <span className="text-[10px] text-muted-foreground/50">· {sideLabel(field.side)}</span>
      </div>

      {!isMedia ? (
        <textarea
          value={value.text}
          onChange={(e) => onChange({ ...value, text: e.target.value })}
          placeholder={`Nhập ${field.name.toLowerCase() || "nội dung"}…`}
          rows={2}
          maxLength={1000}
          className={cn(
            "w-full resize-none rounded-md border bg-background px-3 py-2 text-sm leading-snug text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring/40",
            showError ? "border-destructive" : "border-input"
          )}
        />
      ) : value.preview ? (
        <div className="flex items-center gap-2 rounded-md border border-input bg-background px-2.5 py-2">
          {field.type === "IMAGE" && <img src={value.preview} alt="" className="size-12 rounded object-cover border border-border" />}
          {field.type === "AUDIO" && <audio src={value.preview} controls className="h-8 max-w-full" />}
          {field.type === "VIDEO" && <video src={value.preview} controls className="h-14 rounded border border-border" />}
          <span className="flex-1 truncate text-xs text-muted-foreground">{value.file?.name ?? "Tệp đính kèm"}</span>
          <button
            onClick={() => onChange({ text: "", file: undefined, preview: undefined })}
            title="Gỡ tệp"
            className="shrink-0 text-muted-foreground hover:text-destructive"
          >
            <X className="size-3.5" />
          </button>
        </div>
      ) : (
        <>
          <button
            onClick={() => fileRef.current?.click()}
            className={cn(
              "flex items-center justify-center gap-2 rounded-md border-2 border-dashed py-2.5 text-sm text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground",
              showError ? "border-destructive" : "border-border"
            )}
          >
            {typeMeta(field.type).icon}
            Tải lên {typeMeta(field.type).label.toLowerCase()}
          </button>
          <input ref={fileRef} type="file" accept={accept} className="hidden" onChange={handleFile} />
        </>
      )}
    </div>
  );
}

/* ─────────────────────────── Tiny dropdown ─────────────────────────── */

function PickerMenu({
  label,
  icon,
  items,
  onPick,
  className,
}: {
  label: string;
  icon?: React.ReactNode;
  items: { key: string; label: string; icon?: React.ReactNode; active: boolean }[];
  onPick: (key: string) => void;
  className?: string;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className={cn(
            "flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 text-sm text-foreground transition-colors hover:bg-accent",
            className
          )}
        >
          {icon}
          <span className="truncate">{label}</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-36">
        {items.map((it) => (
          <DropdownMenuItem
            key={it.key}
            className={cn("gap-2", it.active && "bg-accent")}
            onClick={() => onPick(it.key)}
          >
            {it.icon}
            {it.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
