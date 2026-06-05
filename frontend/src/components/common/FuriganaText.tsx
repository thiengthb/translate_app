import { useMemo } from "react";
import { alignFurigana } from "@/lib/furigana";

/**
 * Hiển thị từ tiếng Nhật kèm furigana (ruby text) phía trên các cụm kanji.
 * Tự khớp reading ↔ kanji bằng alignFurigana; phần okurigana (kana) không
 * bị chú thích thừa. Khi không khớp được sẽ chú thích cả từ (fallback an toàn).
 */
export function FuriganaText({ word, reading, className, rubyClassName }: {
    word: string;
    reading?: string | null;
    className?: string;
    rubyClassName?: string;
}) {
    const segments = useMemo(() => alignFurigana(word, reading), [word, reading]);
    const rtClass = rubyClassName ?? "text-[0.45em] font-medium text-muted-foreground";
    return (
        <span lang="ja" className={className}>
            {segments.map((s, i) =>
                s.ruby ? (
                    <ruby key={i}>
                        {s.text}
                        <rt className={rtClass}>{s.ruby}</rt>
                    </ruby>
                ) : (
                    <span key={i}>{s.text}</span>
                ),
            )}
        </span>
    );
}