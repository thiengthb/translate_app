/**
 * Deck access control: a dropdown to switch PUBLIC/PRIVATE + a share-link
 * button when public. Only rendered for the deck owner.
 */
import { useState } from "react";
import { Check, Globe, Link, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { deckApi } from "@/api";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  const current = OPTIONS.find((o) => o.value === visibility) ?? OPTIONS[1]!;
  const CurrentIcon = current.icon;

  const handleChange = async (next: "PUBLIC" | "PRIVATE") => {
    if (next === visibility) return;
    setSaving(true);
    try {
      await deckApi.update(String(deckId), { visibility: next } as never);
      onChanged(next);
      toast.success(next === "PUBLIC" ? "Đã đổi sang công khai." : "Đã đổi sang riêng tư.");
    } catch {
      toast.error("Không thể thay đổi quyền truy cập.");
    } finally {
      setSaving(false);
    }
  };

  const handleShare = () => {
    const url = `${window.location.origin}/deck/${deckId}/preview`;
    navigator.clipboard
      .writeText(url)
      .then(() => {
        setCopied(true);
        toast.success("Đã sao chép liên kết chia sẻ!");
        setTimeout(() => setCopied(false), 2000);
      })
      .catch(() => toast.error("Không thể sao chép."));
  };

  return (
    <div className="flex items-center gap-1.5">
      {/* Access badge + dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            disabled={saving}
            className={cn(
              "flex h-9 items-center gap-1.5 rounded-lg border px-3 text-xs font-medium transition-colors disabled:opacity-60",
              visibility === "PUBLIC"
                ? "border-primary/40 bg-primary/8 text-primary hover:bg-primary/15"
                : "border-border text-muted-foreground hover:bg-accent hover:text-foreground"
            )}
          >
            <CurrentIcon className="size-3.5" />
            {current.label}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-72">
          <DropdownMenuLabel className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
            Quyền truy cập
          </DropdownMenuLabel>
          {OPTIONS.map((opt) => {
            const Icon = opt.icon;
            const isActive = opt.value === visibility;
            return (
              <DropdownMenuItem
                key={opt.value}
                onClick={() => handleChange(opt.value)}
                className="items-start gap-3 py-2.5"
              >
                <div
                  className={cn(
                    "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg",
                    isActive ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
                  )}
                >
                  <Icon className="size-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <p className={cn("text-sm font-semibold", isActive && "text-primary")}>{opt.label}</p>
                    {isActive && <Check className="size-3.5 shrink-0 text-primary" />}
                  </div>
                  <p className="mt-0.5 text-xs leading-snug text-muted-foreground">{opt.description}</p>
                </div>
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Share button (only when public) */}
      {visibility === "PUBLIC" && (
        <button
          type="button"
          onClick={handleShare}
          title="Sao chép liên kết chia sẻ"
          className={cn(
            "flex h-9 items-center gap-1.5 rounded-lg border px-3 text-xs font-medium transition-colors",
            copied
              ? "border-green-400 bg-green-50 text-green-600 dark:bg-green-950/30"
              : "border-border text-muted-foreground hover:bg-accent hover:text-foreground"
          )}
        >
          {copied ? <Check className="size-3.5" /> : <Link className="size-3.5" />}
          {copied ? "Đã sao chép!" : "Chia sẻ"}
        </button>
      )}
    </div>
  );
}
