import { Eye, EyeOff } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useFuriganaEnabled } from "@/hooks/useFuriganaPref";

/** Compact on/off toggle for furigana. Reflects + flips the global preference. */
export function FuriganaToggle({ className }: { className?: string }) {
  const { enabled, toggle } = useFuriganaEnabled();
  return (
    <Button
      variant={enabled ? "secondary" : "outline"}
      size="sm"
      onClick={toggle}
      className={`h-7 gap-1.5 px-2.5 ${className ?? ""}`}
      aria-pressed={enabled}
      title={enabled ? "Tắt furigana (ふりがな)" : "Bật furigana (ふりがな)"}
    >
      {enabled ? <Eye size={14} /> : <EyeOff size={14} />}
      <span className="text-xs">ふりがな</span>
    </Button>
  );
}
