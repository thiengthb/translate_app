/**
 * Deck access control: badge showing PUBLIC/PRIVATE + popover to change it
 * + share-link button when public. Only renders for the deck owner.
 */
import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Check, Globe, Link, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { deckApi } from "@/api";

interface Props {
  deckId: number;
  visibility: "PUBLIC" | "PRIVATE";
  /** Called after a successful visibility change so parent can update state. */
  onChanged: (next: "PUBLIC" | "PRIVATE") => void;
}

const OPTIONS: {
  value: "PUBLIC" | "PRIVATE";
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  description: string;
}[] = [
  {
    value: "PUBLIC",
    icon: Globe,
    label: "Công khai",
    description: "Ai cũng có thể tìm, xem và sao chép bộ thẻ này.",
  },
  {
    value: "PRIVATE",
    icon: Lock,
    label: "Riêng tư",
    description: "Chỉ bạn mới có thể xem và học bộ thẻ này.",
  },
];

export function DeckAccessControl({ deckId, visibility, onChanged }: Props) {
  const [open, setSaving] = useState(false);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const current = OPTIONS.find((o) => o.value === visibility) ?? OPTIONS[1]!;
  const CurrentIcon = current.icon;

  /* ── Change visibility ── */
  const handleChange = async (next: "PUBLIC" | "PRIVATE") => {
    if (next === visibility) { setPopoverOpen(false); return; }
    setSaving(true);
    try {
      await deckApi.update(String(deckId), { visibility: next } as never);
      onChanged(next);
      toast.success(next === "PUBLIC" ? "Đã đổi sang công khai." : "Đã đổi sang riêng tư.");
    } catch {
      toast.error("Không thể thay đổi quyền truy cập.");
    } finally {
      setSaving(false);
      setPopoverOpen(false);
    }
  };

  /* ── Copy share link ── */
  const handleShare = () => {
    const url = `${window.location.origin}/deck/${deckId}/preview`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      toast.success("Đã sao chép liên kết chia sẻ!");
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => toast.error("Không thể sao chép."));
  };

  return (
    <div className="flex items-center gap-1.5">
      {/* ── Access badge + popover ── */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setPopoverOpen((v) => !v)}
          className={cn(
            "flex items-center gap-1.5 h-8 px-2.5 rounded-lg border text-xs font-medium transition-all",
            visibility === "PUBLIC"
              ? "border-primary/40 bg-primary/8 text-primary hover:bg-primary/15"
              : "border-border text-muted-foreground hover:bg-accent hover:text-foreground",
            popoverOpen && "ring-1 ring-primary/40"
          )}
          disabled={open}
        >
          <CurrentIcon className="size-3.5" />
          {current.label}
        </button>

        <AnimatePresence>
          {popoverOpen && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setPopoverOpen(false)} />
              <motion.div
                initial={{ opacity: 0, y: -6, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -6, scale: 0.97 }}
                transition={{ duration: 0.14 }}
                className="absolute left-0 top-full mt-2 z-40 w-72 rounded-xl border border-border bg-popover shadow-xl overflow-hidden"
              >
                <div className="px-4 pt-3 pb-2 border-b border-border">
                  <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                    Quyền truy cập
                  </p>
                </div>
                <div className="p-2 space-y-1">
                  {OPTIONS.map((opt) => {
                    const Icon = opt.icon;
                    const isActive = opt.value === visibility;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => handleChange(opt.value)}
                        className={cn(
                          "w-full flex items-start gap-3 px-3 py-2.5 rounded-lg text-left transition-colors",
                          isActive
                            ? "bg-primary/8 text-foreground"
                            : "hover:bg-accent text-muted-foreground hover:text-foreground"
                        )}
                      >
                        <div className={cn(
                          "size-8 rounded-lg shrink-0 flex items-center justify-center mt-0.5",
                          isActive ? "bg-primary/15 text-primary" : "bg-muted"
                        )}>
                          <Icon className="size-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className={cn("text-sm font-semibold", isActive && "text-primary")}>
                              {opt.label}
                            </p>
                            {isActive && <Check className="size-3.5 text-primary shrink-0" />}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5 leading-snug">
                            {opt.description}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>

      {/* ── Share button (only when PUBLIC) ── */}
      {visibility === "PUBLIC" && (
        <button
          type="button"
          onClick={handleShare}
          className={cn(
            "flex items-center gap-1.5 h-8 px-2.5 rounded-lg border text-xs font-medium transition-all",
            copied
              ? "border-green-400 bg-green-50 dark:bg-green-950/30 text-green-600"
              : "border-border text-muted-foreground hover:bg-accent hover:text-foreground"
          )}
          title="Sao chép liên kết chia sẻ"
        >
          {copied ? <Check className="size-3.5" /> : <Link className="size-3.5" />}
          {copied ? "Đã sao chép!" : "Chia sẻ"}
        </button>
      )}
    </div>
  );
}
