import { useState, useMemo } from "react";
import { AnimatePresence, motion } from "motion/react";
import { cn } from "@/lib/utils";
import { Check, ChevronDown, Upload, X } from "lucide-react";
import { InfoLabel } from "@/components/common/InfoLabel";
import { ScrollHintContainer } from "@/components/common/ScrollHintContainer";

export interface ImportedCard {
  uid: string;
  front: string;
  back: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onImport: (cards: ImportedCard[]) => void;
}

type DelimOpt     = "tab" | "comma" | "semicolon" | "dash" | "custom";
type CardDelimOpt = "newline" | "semicolon" | "pipe" | "custom";

const TERM_DELIMS: { value: DelimOpt; label: string; char: string }[] = [
  { value: "tab",       label: "Tab",         char: "\t" },
  { value: "comma",     label: "Dấu phẩy ,",  char: ","  },
  { value: "semicolon", label: "Chấm phẩy ;", char: ";"  },
  { value: "dash",      label: "Gạch ngang -", char: "-" },
  { value: "custom",    label: "Tùy chỉnh…",  char: ""   },
];

const CARD_DELIMS: { value: CardDelimOpt; label: string; char: string }[] = [
  { value: "newline",   label: "Xuống dòng",  char: "\n" },
  { value: "semicolon", label: "Chấm phẩy ;", char: ";"  },
  { value: "pipe",      label: "Sổ đứng |",   char: "|"  },
  { value: "custom",    label: "Tùy chỉnh…",  char: ""   },
];

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function parseCards(text: string, termChar: string, cardChar: string): ImportedCard[] {
  if (!text.trim() || !termChar) return [];
  const cardSep = cardChar === "\n" ? /\r?\n/ : new RegExp(escapeRegex(cardChar));
  const results: ImportedCard[] = [];
  for (const raw of text.split(cardSep)) {
    const line = raw.trim();
    if (!line) continue;
    const idx = line.indexOf(termChar);
    if (idx === -1) continue;
    const front = line.slice(0, idx).trim();
    const back  = line.slice(idx + termChar.length).trim();
    if (front || back) {
      results.push({ uid: crypto.randomUUID(), front, back });
    }
  }
  return results;
}

export function ImportCardsModal({ open, onClose, onImport }: Props) {
  const [text, setText]             = useState("");
  const [termDelim, setTermDelim]   = useState<DelimOpt>("tab");
  const [cardDelim, setCardDelim]   = useState<CardDelimOpt>("newline");
  const [customTerm, setCustomTerm] = useState("");
  const [customCard, setCustomCard] = useState("");
  const [termOpen, setTermOpen]     = useState(false);
  const [cardOpen, setCardOpen]     = useState(false);

  const termChar = termDelim === "custom"
    ? customTerm
    : TERM_DELIMS.find((d) => d.value === termDelim)!.char;

  const cardChar = cardDelim === "custom"
    ? customCard
    : CARD_DELIMS.find((d) => d.value === cardDelim)!.char;

  const parsed = useMemo(
    () => parseCards(text, termChar, cardChar),
    [text, termChar, cardChar]
  );

  const reset = () => {
    setText(""); setTermDelim("tab"); setCardDelim("newline");
    setCustomTerm(""); setCustomCard("");
  };

  const handleImport = () => {
    if (parsed.length === 0) return;
    onImport(parsed);
    reset();
    onClose();
  };

  const handleClose = () => { reset(); onClose(); };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={handleClose}
          />

          {/* Dialog */}
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6"
            initial={{ opacity: 0, scale: 0.96, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 10 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
          >
            <div
              className="w-full max-w-4xl rounded-xl border border-border bg-card shadow-2xl flex flex-col"
              style={{ maxHeight: "calc(100vh - 48px)" }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* ── Header ── */}
              <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-border shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Upload className="size-4 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-base font-semibold text-foreground leading-tight">Import thẻ</h2>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Dán từ Word, Excel, Quizlet… mỗi dòng một thẻ
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleClose}
                  className="size-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors shrink-0"
                >
                  <X className="size-4" />
                </button>
              </div>

              {/* ── Body ── */}
              <ScrollHintContainer
                axis="vertical"
                className="flex-1 min-h-0"
                viewportClassName="px-5 sm:px-6 py-5"
              >
                <div className="flex flex-col lg:flex-row gap-5 min-h-0">

                  {/* LEFT — controls + textarea */}
                  <div className="flex flex-col gap-4 lg:w-[55%]">

                    {/* Delimiter selects */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <InfoLabel
                          title={
                            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                              Ký tự phân cách thuật ngữ
                            </span>
                          }
                          info="Ký tự nằm giữa thuật ngữ và định nghĩa trên cùng một dòng."
                          side="top"
                          iconSize={12}
                        />
                        <DelimSelect
                          options={TERM_DELIMS}
                          value={termDelim}
                          open={termOpen}
                          onOpenChange={setTermOpen}
                          onChange={(v) => { setTermDelim(v as DelimOpt); setTermOpen(false); }}
                        />
                        {termDelim === "custom" && (
                          <input
                            value={customTerm}
                            onChange={(e) => setCustomTerm(e.target.value)}
                            placeholder="Nhập ký tự…"
                            maxLength={10}
                            className="w-full h-9 px-3 text-sm rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/50"
                          />
                        )}
                      </div>

                      <div className="space-y-2">
                        <InfoLabel
                          title={
                            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                              Ký tự phân cách thẻ
                            </span>
                          }
                          info="Ký tự ngăn cách giữa các thẻ khác nhau. Mặc định là xuống dòng."
                          side="top"
                          iconSize={12}
                        />
                        <DelimSelect
                          options={CARD_DELIMS}
                          value={cardDelim}
                          open={cardOpen}
                          onOpenChange={setCardOpen}
                          onChange={(v) => { setCardDelim(v as CardDelimOpt); setCardOpen(false); }}
                        />
                        {cardDelim === "custom" && (
                          <input
                            value={customCard}
                            onChange={(e) => setCustomCard(e.target.value)}
                            placeholder="Nhập ký tự…"
                            maxLength={10}
                            className="w-full h-9 px-3 text-sm rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/50"
                          />
                        )}
                      </div>
                    </div>

                    {/* Textarea */}
                    <div className="space-y-2 flex-1 flex flex-col">
                      <InfoLabel
                        title={
                          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            Nội dung
                          </span>
                        }
                        info={`Dán nội dung vào đây. Mỗi thẻ một dòng, thuật ngữ và định nghĩa cách nhau bằng "${termChar === "\t" ? "Tab" : termChar || "ký tự đã chọn"}".`}
                        side="right"
                        iconSize={12}
                      />
                      <textarea
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        placeholder={"apple\ttáo\nbanana\tchuối\ncherry\tanh đào"}
                        className="flex-1 w-full min-h-[200px] lg:min-h-[260px] px-4 py-3 text-sm rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring/50 resize-none font-mono leading-relaxed"
                      />
                    </div>
                  </div>

                  {/* RIGHT — preview */}
                  <div className="flex flex-col gap-2 lg:flex-1 min-h-0">
                    <div className="flex items-center justify-between">
                      <InfoLabel
                        title={
                          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            Xem trước
                          </span>
                        }
                        info="Danh sách thẻ được phân tích từ nội dung bạn dán vào."
                        side="top"
                        iconSize={12}
                      />
                      <span className={cn(
                        "text-xs font-semibold tabular-nums px-2 py-0.5 rounded-full transition-colors",
                        parsed.length > 0
                          ? "bg-primary/10 text-primary"
                          : text.trim()
                            ? "bg-destructive/10 text-destructive"
                            : "bg-muted text-muted-foreground"
                      )}>
                        {parsed.length} thẻ
                      </span>
                    </div>

                    <div className="flex-1 rounded-lg border border-border bg-background overflow-hidden flex flex-col min-h-[180px] lg:min-h-0">
                      {!text.trim() ? (
                        <div className="flex-1 flex flex-col items-center justify-center gap-2 px-4 py-8 text-center">
                          <Upload className="size-8 text-muted-foreground/30" />
                          <p className="text-xs text-muted-foreground">
                            Dán nội dung bên trái để xem trước thẻ
                          </p>
                        </div>
                      ) : parsed.length === 0 ? (
                        <div className="flex-1 flex flex-col items-center justify-center gap-2 px-4 py-8 text-center">
                          <p className="text-sm font-medium text-foreground">Không phân tích được thẻ nào</p>
                          <p className="text-xs text-muted-foreground">
                            Kiểm tra lại ký tự phân cách — đảm bảo ký tự phân cách đúng với nội dung bạn dán vào.
                          </p>
                        </div>
                      ) : (
                        <ScrollHintContainer axis="vertical" className="flex-1 min-h-0">
                          <div className="divide-y divide-border">
                            {parsed.map((c, i) => (
                              <div key={c.uid} className="grid grid-cols-[28px_1fr_1fr] text-xs hover:bg-muted/40 transition-colors">
                                <div className="flex items-center justify-center py-2.5 text-muted-foreground/60 font-mono select-none border-r border-border">
                                  {i + 1}
                                </div>
                                <div className="px-3 py-2.5 font-medium text-foreground truncate border-r border-border">
                                  {c.front || <span className="text-muted-foreground/40 italic">trống</span>}
                                </div>
                                <div className="px-3 py-2.5 text-muted-foreground truncate">
                                  {c.back || <span className="italic">trống</span>}
                                </div>
                              </div>
                            ))}
                          </div>
                        </ScrollHintContainer>
                      )}
                    </div>
                  </div>
                </div>
              </ScrollHintContainer>

              {/* ── Footer ── */}
              <div className="px-5 sm:px-6 py-3.5 border-t border-border flex items-center justify-between gap-3 shrink-0">
                <p className="text-xs text-muted-foreground hidden sm:block">
                  {parsed.length > 0
                    ? `Sẽ thêm ${parsed.length} thẻ vào cuối deck`
                    : "Dán nội dung và chọn đúng ký tự phân cách"}
                </p>
                <div className="flex items-center gap-2 ml-auto">
                  <button
                    onClick={handleClose}
                    className="h-9 px-4 text-sm rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                  >
                    Hủy
                  </button>
                  <button
                    onClick={handleImport}
                    disabled={parsed.length === 0}
                    className="flex items-center gap-1.5 h-9 px-4 text-sm font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <Check className="size-3.5" />
                    Thêm {parsed.length > 0 ? `${parsed.length} thẻ` : "thẻ"}
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

/* ─── Delimiter select ─── */
function DelimSelect<T extends string>({
  options, value, open, onOpenChange, onChange,
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
        className={cn(
          "w-full flex items-center justify-between gap-2 h-9 px-3 rounded-lg border border-border bg-background text-sm text-foreground hover:bg-accent transition-colors",
          open && "ring-2 ring-ring/50"
        )}
      >
        <span className="truncate">{active.label}</span>
        <ChevronDown className={cn(
          "size-3.5 text-muted-foreground shrink-0 transition-transform duration-150",
          open && "rotate-180"
        )} />
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
              className="absolute left-0 top-full mt-1 z-20 w-full rounded-lg border border-border bg-popover shadow-lg py-1 overflow-hidden"
            >
              {options.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => onChange(opt.value)}
                  className={cn(
                    "w-full h-9 px-3 text-sm text-left flex items-center gap-2 transition-colors",
                    opt.value === value
                      ? "bg-accent text-foreground font-semibold"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent/60"
                  )}
                >
                  <span className="flex-1">{opt.label}</span>
                  {opt.value === value && <Check className="size-3.5 text-primary shrink-0" />}
                </button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
