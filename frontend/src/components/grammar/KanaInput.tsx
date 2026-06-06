import { forwardRef } from "react";
import { toKana } from "wanakana";
import { Input } from "@/components/ui/input";

type InputProps = React.ComponentProps<typeof Input>;

interface KanaInputProps extends Omit<InputProps, "value" | "onChange"> {
  value: string;
  /** Receives the romaji-to-hiragana converted value. */
  onChange: (value: string) => void;
}

/**
 * Text input with Bunpro-style live romaji → hiragana conversion (an IME):
 * typing "ku" becomes く, while an incomplete "k" stays "k" until the kana is
 * finished. Handles ん, っ (double consonants) and ya/yu/yo combos via wanakana.
 */
export const KanaInput = forwardRef<HTMLInputElement, KanaInputProps>(
  ({ value, onChange, ...rest }, ref) => (
    <Input
      ref={ref}
      value={value}
      onChange={(e) => onChange(toKana(e.target.value, { IMEMode: "toHiragana" }))}
      {...rest}
    />
  ),
);

KanaInput.displayName = "KanaInput";
