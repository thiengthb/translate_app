/**
 * Multi-column importer for field-based decks. The user pastes a table (one
 * card per row, columns separated by a delimiter), maps each column to a deck
 * field, and we emit one row of `{ fieldId → text }` per card. Media fields
 * can't be filled by paste, so only text columns are mapped here.
 */
import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { cn } from "@/lib/utils";
import { Check, ChevronDown, Upload, X } from "lucide-react";
import { InfoLabel } from "@/components/common/InfoLabel";
import { ScrollHintContainer } from "@/components/common/ScrollHintContainer";
import type { FieldDef } from "@/pages/student/shared/FieldDeckEditor";

/** A parsed card: text value per fieldId. */
export type ImportedFieldRow = Record<string, string>;

interface Props {
  open: boolean;
  onClose: () => void;
  fields: FieldDef[];
  onImport: (rows: ImportedFieldRow[]) => void;
}

type DelimOpt = "tab" | "comma" | "semicolon" | "pipe" | "custom";
type RowDelimOpt = "newline" | "semicolon" | "custom";

const COL_DELIMS: { value: DelimOpt; label: string; char: string }[] = [
  { value: "tab", label: "Tab", char: "\t" },
  { value: "comma", label: "Dấu phẩy ,", char: "," },
  { value: "semicolon", label: "Chấm phẩy ;", char: ";" },
  { value: "pipe", label: "Sổ đứng |", char: "|" },
  { value: "custom", label: "Tùy chỉnh…", char: "" },
];

const ROW_DELIMS: { value: RowDelimOpt; label: string; char: string }[] = [
  { value: "newline", label: "Xuống dòng", char: "\n" },
  { value: "semicolon", label: "Chấm phẩy ;", char: ";" },
  { value: "custom", label: "Tùy chỉnh…", char: "" },
];

const SKIP = "__skip__";

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Split pasted text into a grid of trimmed cell strings. */
function parseGrid(text: string, colChar: string, rowChar: string): string[][] {
  if (!text.trim() || !colChar) return [];
  const rowSep = rowChar === "\n" ? /\r?\n/ : new RegExp(escapeRegex(rowChar));
  const colSep = new RegExp(escapeRegex(colChar));
  const rows: string[][] = [];
  for (const raw of text.split(rowSep)) {
    const line = raw.trim();
    if (!line) continue;
    rows.push(line.split(colSep).map((c) => c.trim()));
  }
  return rows;
}

export function ImportFieldCardsModal({ open, onClose, fields, onImport }: Props) {
  const textFields = useMemo(() => fields.filter((f) => f.type === "TEXT"), [fields]);

  const [text, setText] = useState("");
  const [colDelim, setColDelim] = useState<DelimOpt>("tab");
  const [rowDelim, setRowDelim] = useState<RowDelimOpt>("newline");
  const [customCol, setCustomCol] = useState("");
  const [customRow, setCustomRow] = useState("");
  const [colOpen, setColOpen] = useState(false);
  const [rowOpen, setRowOpen] = useState(false);
  // Column index → fieldId (or SKIP). Defaults to the text fields in order.
  const [mapping, setMapping] = useState<string[]>([]);

  const colChar = colDelim === "custom" ? customCol : COL_DELIMS.find((d) => d.value === colDelim)!.char;
  const rowChar = rowDelim === "custom" ? customRow : ROW_DELIMS.find((d) => d.value === rowDelim)!.char;

  const grid = useMemo(() => parseGrid(text, colChar, rowChar), [text, colChar, rowChar]);
  const colCount = useMemo(() => grid.reduce((m, r) => Math.max(m, r.length), 0), [grid]);

  // Resolve the effective mapping: explicit choices, then text fields in order.
  const effectiveMapping = useMemo(() => {
    const out: string[] = [];
    for (let i = 0; i < colCount; i++) {
      out[i] = mapping[i] ?? (textFields[i]?.id ?? SKIP);
    }
    return out;
  }, [colCount, mapping, textFields]);

  const rows = useMemo<ImportedFieldRow[]>(() => {
    if (grid.length === 0) return [];
    return grid
      .map((cells) => {
        const row: ImportedFieldRow = {};
        effectiveMapping.forEach((fieldId, col) => {
          if (fieldId === SKIP) return;
          const v = cells[col]?.trim();
          if (v) row[fieldId] = v;
        });
        return row;
      })
      .filter((r) => Object.keys(r).length > 0);
  }, [grid, effectiveMapping]);

  const reset = () => {
    setText("");
    setColDelim("tab");
    setRowDelim("newline");
    setCustomCol("");
    setCustomRow("");
    setMapping([]);
  };

  const handleImport = () => {
    if (rows.length === 0) return;
    onImport(rows);
    reset();
    onClose();
  };
  const handleClose = () => {
    reset();
    onClose();
  };

  const setColMap = (col: number, fieldId: string) =>
    setMapping((prev) => {
      const next = [...prev];
      for (let i = next.length; i <= col; i++) next[i] = effectiveMapping[i] ?? SKIP;
      next[col] = fieldId;
      return next;
    });

  const fieldName = (id: string) => fields.find((f) => f.id === id)?.name ?? "—";

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
          />
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6"
            initial={{ opacity: 0, scale: 0.96, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 10 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
          >
            <div
              className="flex w-full max-w-4xl flex-col rounded-xl border border-border bg-card shadow-2xl"
              style={{ maxHeight: "calc(100vh - 48px)" }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex shrink-0 items-center justify-between border-b border-border px-5 py-4 sm:px-6">
                <div className="flex items-center gap-2.5">
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                    <Upload className="size-4 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-base font-semibold leading-tight text-foreground">Import nhiều cột</h2>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Dán bảng — mỗi dòng một thẻ, mỗi cột một trường
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleClose}
                  className="flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                >
                  <X className="size-4" />
                </button>
              </div>

              {/* Body */}
              <ScrollHintContainer axis="vertical" className="min-h-0 flex-1" viewportClassName="px-5 py-5 sm:px-6">
                <div className="flex min-h-0 flex-col gap-5 lg:flex-row">
                  {/* LEFT */}
                  <div className="flex flex-col gap-4 lg:w-[55%]">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <InfoLabel
                          title={<span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Phân cách cột</span>}
                          info="Ký tự ngăn cách các trường trên cùng một dòng."
                          side="top"
                          iconSize={12}
                        />
                        <DelimSelect options={COL_DELIMS} value={colDelim} open={colOpen} onOpenChange={setColOpen} onChange={(v) => { setColDelim(v as DelimOpt); setColOpen(false); }} />
                        {colDelim === "custom" && (
                          <input value={customCol} onChange={(e) => setCustomCol(e.target.value)} placeholder="Nhập ký tự…" maxLength={10} className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/50" />
                        )}
                      </div>
                      <div className="space-y-2">
                        <InfoLabel
                          title={<span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Phân cách thẻ</span>}
                          info="Ký tự ngăn cách giữa các thẻ. Mặc định là xuống dòng."
                          side="top"
                          iconSize={12}
                        />
                        <DelimSelect options={ROW_DELIMS} value={rowDelim} open={rowOpen} onOpenChange={setRowOpen} onChange={(v) => { setRowDelim(v as RowDelimOpt); setRowOpen(false); }} />
                        {rowDelim === "custom" && (
                          <input value={customRow} onChange={(e) => setCustomRow(e.target.value)} placeholder="Nhập ký tự…" maxLength={10} className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/50" />
                        )}
                      </div>
                    </div>

                    <div className="flex flex-1 flex-col space-y-2">
                      <InfoLabel
                        title={<span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Nội dung</span>}
                        info="Dán bảng từ Excel / Google Sheets / Quizlet. Mỗi dòng một thẻ."
                        side="right"
                        iconSize={12}
                      />
                      <textarea
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        placeholder={"犬\tinu\tcon chó\nNhà\tいえ\thouse"}
                        className="min-h-[200px] w-full flex-1 resize-none rounded-lg border border-input bg-background px-4 py-3 font-mono text-sm leading-relaxed text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring/50 lg:min-h-[240px]"
                      />
                    </div>
                  </div>

                  {/* RIGHT — column mapping + preview */}
                  <div className="flex min-h-0 flex-col gap-2 lg:flex-1">
                    <div className="flex items-center justify-between">
                      <InfoLabel
                        title={<span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Gán cột → trường</span>}
                        info="Chọn trường cho từng cột. Cột không cần thì để Bỏ qua."
                        side="top"
                        iconSize={12}
                      />
                      <span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums", rows.length > 0 ? "bg-primary/10 text-primary" : text.trim() ? "bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground")}>
                        {rows.length} thẻ
                      </span>
                    </div>

                    <div className="flex min-h-[180px] flex-1 flex-col overflow-hidden rounded-lg border border-border bg-background lg:min-h-0">
                      {colCount === 0 ? (
                        <div className="flex flex-1 flex-col items-center justify-center gap-2 px-4 py-8 text-center">
                          <Upload className="size-8 text-muted-foreground/30" />
                          <p className="text-xs text-muted-foreground">Dán nội dung bên trái để gán cột</p>
                        </div>
                      ) : (
                        <ScrollHintContainer axis="vertical" className="min-h-0 flex-1">
                          {/* Mapping row */}
                          <div className="flex gap-2 border-b border-border bg-muted/30 p-2">
                            {Array.from({ length: colCount }).map((_, col) => (
                              <div key={col} className="min-w-0 flex-1">
                                <MapSelect
                                  value={effectiveMapping[col]}
                                  fields={textFields}
                                  onChange={(id) => setColMap(col, id)}
                                />
                              </div>
                            ))}
                          </div>
                          {/* Preview rows */}
                          <div className="divide-y divide-border">
                            {grid.slice(0, 50).map((cells, i) => (
                              <div key={i} className="flex gap-2 px-2 py-1.5 text-xs hover:bg-muted/40">
                                {Array.from({ length: colCount }).map((_, col) => {
                                  const skipped = effectiveMapping[col] === SKIP;
                                  return (
                                    <div key={col} className={cn("min-w-0 flex-1 truncate", skipped ? "text-muted-foreground/30 line-through" : "text-foreground")}>
                                      {cells[col] ?? <span className="italic text-muted-foreground/30">—</span>}
                                    </div>
                                  );
                                })}
                              </div>
                            ))}
                          </div>
                        </ScrollHintContainer>
                      )}
                    </div>
                  </div>
                </div>
              </ScrollHintContainer>

              {/* Footer */}
              <div className="flex shrink-0 items-center justify-between gap-3 border-t border-border px-5 py-3.5 sm:px-6">
                <p className="hidden text-xs text-muted-foreground sm:block">
                  {rows.length > 0
                    ? `Sẽ thêm ${rows.length} thẻ — cột đang gán cho: ${effectiveMapping.filter((m) => m !== SKIP).map(fieldName).join(", ")}`
                    : "Dán nội dung và gán cột cho từng trường"}
                </p>
                <div className="ml-auto flex items-center gap-2">
                  <button onClick={handleClose} className="h-9 rounded-lg border border-border px-4 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
                    Hủy
                  </button>
                  <button
                    onClick={handleImport}
                    disabled={rows.length === 0}
                    className="flex h-9 items-center gap-1.5 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Check className="size-3.5" />
                    Thêm {rows.length > 0 ? `${rows.length} thẻ` : "thẻ"}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

/* ─── Column → field mapping select ─── */
function MapSelect({ value, fields, onChange }: { value: string; fields: FieldDef[]; onChange: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const label = value === SKIP ? "Bỏ qua" : fields.find((f) => f.id === value)?.name ?? "Bỏ qua";
  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex h-7 w-full items-center justify-between gap-1 rounded-md border px-2 text-[11px] font-semibold transition-colors",
          value === SKIP ? "border-dashed border-border text-muted-foreground/60" : "border-border bg-background text-foreground hover:bg-accent"
        )}
      >
        <span className="truncate">{label}</span>
        <ChevronDown className="size-3 shrink-0 text-muted-foreground" />
      </button>
      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.1 }}
              className="absolute left-0 top-full z-20 mt-1 w-40 overflow-hidden rounded-lg border border-border bg-popover py-1 shadow-lg"
            >
              {fields.map((f) => (
                <button
                  key={f.id}
                  onClick={() => { onChange(f.id); setOpen(false); }}
                  className={cn("flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs transition-colors hover:bg-accent", value === f.id && "bg-accent font-semibold")}
                >
                  <span className="flex-1 truncate">{f.name}</span>
                  {value === f.id && <Check className="size-3 text-primary" />}
                </button>
              ))}
              <button
                onClick={() => { onChange(SKIP); setOpen(false); }}
                className={cn("flex w-full items-center gap-2 border-t border-border px-3 py-1.5 text-left text-xs text-muted-foreground transition-colors hover:bg-accent", value === SKIP && "bg-accent font-semibold")}
              >
                <span className="flex-1">Bỏ qua</span>
                {value === SKIP && <Check className="size-3 text-primary" />}
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─── Delimiter select (same look as ImportCardsModal) ─── */
function DelimSelect<T extends string>({
  options,
  value,
  open,
  onOpenChange,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onChange: (v: T) => void;
}) {
  const active = options.find((o) => o.value === value)!;
  return (
    <div className="relative">
      <button
        onClick={() => onOpenChange(!open)}
        className={cn("flex h-9 w-full items-center justify-between gap-2 rounded-lg border border-border bg-background px-3 text-sm text-foreground transition-colors hover:bg-accent", open && "ring-2 ring-ring/50")}
      >
        <span className="truncate">{active.label}</span>
        <ChevronDown className={cn("size-3.5 shrink-0 text-muted-foreground transition-transform duration-150", open && "rotate-180")} />
      </button>
      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => onOpenChange(false)} />
            <motion.div
              initial={{ opacity: 0, y: -4, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.97 }}
              transition={{ duration: 0.1 }}
              className="absolute left-0 top-full z-20 mt-1 w-full overflow-hidden rounded-lg border border-border bg-popover py-1 shadow-lg"
            >
              {options.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => onChange(opt.value)}
                  className={cn("flex h-9 w-full items-center gap-2 px-3 text-left text-sm transition-colors", opt.value === value ? "bg-accent font-semibold text-foreground" : "text-muted-foreground hover:bg-accent/60 hover:text-foreground")}
                >
                  <span className="flex-1">{opt.label}</span>
                  {opt.value === value && <Check className="size-3.5 shrink-0 text-primary" />}
                </button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
