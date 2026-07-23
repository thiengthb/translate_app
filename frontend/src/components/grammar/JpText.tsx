import type { RubySegment } from "@/api/features/grammar/grammar-learn.api";

/**
 * Japanese text rendered with optional furigana (<ruby>) and an optional grammar
 * span highlighted. A segment is colored when its character range overlaps any
 * occurrence of `highlight`. When `segments` is absent the raw text is shown, so
 * this safely renders before (or without) furigana data.
 */
export function JpText({ text, segments, highlight }: {
  text: string;
  segments?: RubySegment[] | null;
  highlight?: string | null;
}) {
  const ranges: Array<[number, number]> = [];
  if (highlight) {
    let i = text.indexOf(highlight);
    while (i >= 0) {
      ranges.push([i, i + highlight.length]);
      i = text.indexOf(highlight, i + highlight.length);
    }
  }
  const segs = segments && segments.length > 0 ? segments : [{ text, ruby: null }];
  let pos = 0;
  return (
    <>
      {segs.map((s, i) => {
        const start = pos;
        pos += s.text.length;
        const hl = ranges.some(([a, b]) => start < b && start + s.text.length > a);
        const cls = hl ? "text-primary font-semibold" : undefined;
        return s.ruby ? (
          <ruby key={i} className={cls}>
            {s.text}
            <rt className={`text-[0.55em] font-normal ${hl ? "" : "text-muted-foreground"}`}>
              {s.ruby}
            </rt>
          </ruby>
        ) : (
          <span key={i} className={cls}>{s.text}</span>
        );
      })}
    </>
  );
}
