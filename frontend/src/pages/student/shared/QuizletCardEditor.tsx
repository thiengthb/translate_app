/**
 * Shared card-editor components used by both CreateQuizletDeckPage
 * and EditQuizletDeckPage so the two pages look and feel identical.
 */
import { useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Image as ImageIcon, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

/* ─── Constants ─── */
export const MAX_CARDS = 1000;

/* ─── Types ─── */
export interface CardDraft {
  uid: string;
  flashcardId?: number;
  deckItemId?: number;
  front: string;
  back: string;
  imageUrl?: string;
  imageFile?: File;
  imagePreview?: string;
  pendingDelete?: boolean;
}

export const makeCard = (): CardDraft => ({
  uid: crypto.randomUUID(),
  front: "",
  back: "",
});

/* ─── Sortable wrapper ─── */
export interface CardEditorProps {
  uid: string;
  index: number;
  front: string;
  back: string;
  imagePreview?: string;
  imageUrl?: string;
  canDelete: boolean;
  isDuplicate?: boolean;
  /** When true, forces error state on empty fields even if not blurred yet. */
  submitted?: boolean;
  onChangeFront: (v: string) => void;
  onChangeBack: (v: string) => void;
  onImageSelect: (file: File, preview: string) => void;
  onImageClear: () => void;
  onDelete: () => void;
  dragHandleProps?: React.HTMLAttributes<HTMLButtonElement>;
}

export function SortableCardEditor(props: CardEditorProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: props.uid });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : undefined,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <CardEditor {...props} dragHandleProps={{ ...attributes, ...listeners }} />
    </div>
  );
}

/* ─── Card editor ─── */
function CardEditor({
  index, front, back, imagePreview, imageUrl,
  canDelete, isDuplicate, submitted, onChangeFront, onChangeBack,
  onImageSelect, onImageClear, onDelete, dragHandleProps,
}: CardEditorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [frontTouched, setFrontTouched] = useState(false);
  const [backTouched,  setBackTouched]  = useState(false);

  const frontError = (submitted || frontTouched) && !front.trim();
  const backError  = (submitted || backTouched)  && !back.trim();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast.error("Chọn file ảnh."); return; }
    onImageSelect(file, URL.createObjectURL(file));
    e.target.value = "";
  };

  const displayImage = imagePreview || imageUrl;

  return (
    <div className={cn(
      "rounded-xl border bg-card shadow-sm overflow-hidden group transition-colors",
      isDuplicate
        ? "border-amber-400 dark:border-amber-500 shadow-amber-100 dark:shadow-amber-900/20"
        : "border-border"
    )}>
      {/* Header */}
      <div className={cn(
        "flex items-center justify-between px-5 py-2.5 border-b",
        isDuplicate
          ? "border-amber-200 dark:border-amber-700 bg-amber-50/60 dark:bg-amber-900/20"
          : "border-border bg-muted/30"
      )}>
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-muted-foreground">{index}</span>
          {isDuplicate && (
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 leading-none">
              Trùng lặp
            </span>
          )}
        </div>
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            {...dragHandleProps}
            className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-accent transition-colors cursor-grab active:cursor-grabbing touch-none"
            title="Kéo để sắp xếp"
          >
            <GripVertical className="size-4" />
          </button>
          <button
            onClick={onDelete}
            disabled={!canDelete}
            className="p-1.5 rounded text-muted-foreground hover:text-destructive hover:bg-accent disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="Xóa thẻ"
          >
            <Trash2 className="size-4" />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex items-stretch px-4 pb-3.5 pt-3 gap-0">
        <TermField
          value={front} onChange={onChangeFront} placeholder="Nhập thuật ngữ" label="Thuật ngữ"
          hasError={frontError} onBlur={() => setFrontTouched(true)}
        />
        <div className="w-px bg-border mx-6 self-stretch" />
        <TermField
          value={back} onChange={onChangeBack} placeholder="Nhập định nghĩa" label="Định nghĩa"
          hasError={backError} onBlur={() => setBackTouched(true)}
        />
        <div className="w-px bg-border mx-6 self-stretch" />

        {/* Image */}
        <div className="shrink-0 self-center">
          {displayImage ? (
            <div className="relative w-24 h-16">
              <img src={displayImage} alt="Ảnh thẻ" className="w-24 h-16 rounded-lg object-cover border border-border" />
              <button
                onClick={onImageClear}
                className="absolute -top-2 -right-2 size-5 rounded-full bg-destructive text-white flex items-center justify-center shadow-md hover:bg-destructive/90 transition-colors"
              >
                <X className="size-3" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-24 h-16 rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center gap-1.5 text-muted-foreground hover:border-foreground/30 hover:text-foreground hover:bg-accent/50 transition-colors"
            >
              <ImageIcon className="size-5" />
              <span className="text-[10px] font-semibold uppercase tracking-wide">Ảnh</span>
            </button>
          )}
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
        </div>
      </div>
    </div>
  );
}

/* ─── Term field ─── */
function TermField({ value, onChange, placeholder, label, hasError, onBlur }: {
  value: string; onChange: (v: string) => void; placeholder: string; label: string;
  hasError?: boolean; onBlur?: () => void;
}) {
  return (
    <div className="flex-1 min-w-0 flex flex-col justify-end">
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        placeholder={placeholder}
        rows={2}
        maxLength={500}
        className={cn(
          "w-full bg-transparent text-foreground font-semibold text-sm placeholder:text-muted-foreground/60 focus:outline-none pb-0 border-b-2 transition-colors resize-none leading-snug",
          hasError
            ? "border-destructive focus:border-destructive"
            : "border-border focus:border-primary"
        )}
      />
      <div className="mt-2 flex items-center gap-1.5">
        <p className={cn(
          "text-[10px] font-semibold uppercase tracking-widest select-none",
          hasError ? "text-destructive" : "text-muted-foreground"
        )}>
          {label}
        </p>
        {hasError && (
          <p className="text-[10px] text-destructive">— bắt buộc</p>
        )}
      </div>
    </div>
  );
}

/* ─── Sortable card list ─── */
interface SortableCardListProps {
  cards: CardDraft[];
  onDragEnd: (event: DragEndEvent) => void;
  onChangeFront: (uid: string, v: string) => void;
  onChangeBack: (uid: string, v: string) => void;
  onImageSelect: (uid: string, file: File, preview: string) => void;
  onImageClear: (uid: string) => void;
  onDelete: (uid: string) => void;
  duplicateFronts?: Set<string>;
  /** When true, shows error state on all empty fields immediately. */
  submitted?: boolean;
}

export function SortableCardList({
  cards, onDragEnd, onChangeFront, onChangeBack,
  onImageSelect, onImageClear, onDelete, duplicateFronts, submitted,
}: SortableCardListProps) {
  const visible = cards.filter((c) => !c.pendingDelete);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={visible.map((c) => c.uid)} strategy={verticalListSortingStrategy}>
        <ul className="space-y-3">
          <AnimatePresence initial={false}>
            {visible.map((card, i) => (
              <motion.li
                key={card.uid}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.97, height: 0, marginBottom: 0 }}
                transition={{ duration: 0.15 }}
              >
                <SortableCardEditor
                  uid={card.uid}
                  index={i + 1}
                  front={card.front}
                  back={card.back}
                  imagePreview={card.imagePreview}
                  imageUrl={card.imageUrl}
                  canDelete={visible.length > 1}
                  isDuplicate={duplicateFronts?.has(card.front.trim().toLowerCase())}
                  submitted={submitted}
                  onChangeFront={(v) => onChangeFront(card.uid, v)}
                  onChangeBack={(v) => onChangeBack(card.uid, v)}
                  onImageSelect={(f, p) => onImageSelect(card.uid, f, p)}
                  onImageClear={() => onImageClear(card.uid)}
                  onDelete={() => onDelete(card.uid)}
                />
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      </SortableContext>
    </DndContext>
  );
}

/* ─── Bottom add-card button ─── */
export function AddCardButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center justify-center gap-2 h-12 rounded-xl border-2 border-dashed border-border text-sm font-medium text-muted-foreground hover:text-foreground hover:border-foreground/30 hover:bg-accent/40 transition-colors"
    >
      <Plus className="size-4" />
      Thêm thẻ
    </button>
  );
}
