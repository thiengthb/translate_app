import { useEffect, useMemo, useRef, useState } from "react";

/** Resolve the app's theme foreground colour so iframe content stays readable
 *  on both light and dark backgrounds (the iframe is isolated and can't see the
 *  app's CSS variables, and bare `inherit` falls back to the UA default black). */
export function appForegroundColor(): string {
  if (typeof window === "undefined") return "#1f2937";
  const v = getComputedStyle(document.documentElement).getPropertyValue("--foreground").trim();
  return v || "#1f2937";
}

interface TemplateCardFaceProps {
  html: string;
  styling: string | null;
  large?: boolean;
  onFlip?: () => void;
}

/**
 * Renders a flashcard side's template HTML inside an isolated iframe and
 * auto-sizes its height to the content. Ported from AnkiStudyPage so the SRS
 * mode keeps its template rendering after the screens were unified.
 *
 * `allow-same-origin` (without `allow-scripts`) lets the parent measure content
 * height and forward clicks for flipping, while still blocking template scripts.
 */
export function TemplateCardFace({ html, styling, large = false, onFlip }: TemplateCardFaceProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const minH = large ? 320 : 200;
  const [height, setHeight] = useState<number>(minH);

  const onFlipRef = useRef(onFlip);
  onFlipRef.current = onFlip;

  const fg = appForegroundColor();
  const srcDoc = useMemo(
    () => `<!doctype html><html><head><meta charset="utf-8"><style>
:root { color-scheme: light dark; }
html, body {
  margin: 0;
  padding: 16px 20px;
  font-family: ui-sans-serif, system-ui, sans-serif;
  background: transparent;
  color: ${fg};
  overflow: hidden;
  cursor: ${onFlip ? "pointer" : "auto"};
}
a, button, input, textarea, select, audio, video, [contenteditable] { cursor: auto; }
img, video { max-width: 100%; height: auto; }
audio { max-width: 100%; }
${styling ?? ""}
</style></head><body><div class="card">${html}</div></body></html>`,
    [html, styling, fg, onFlip]
  );

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const measure = () => {
      try {
        const doc = iframe.contentDocument;
        if (!doc || !doc.body) return;
        const measured = Math.max(doc.body.scrollHeight, doc.documentElement.scrollHeight);
        if (measured > 0) setHeight(Math.max(minH, measured));
      } catch {
        // ignore — cross-origin/sandbox issues
      }
    };

    const onClick = (e: Event) => {
      if (!onFlipRef.current) return;
      const target = e.target as HTMLElement | null;
      if (target?.closest("a, button, input, textarea, select, audio, video, [contenteditable]")) return;
      onFlipRef.current();
    };

    const attachClick = () => {
      try {
        iframe.contentDocument?.addEventListener("click", onClick);
      } catch {
        // ignore
      }
    };

    const onLoad = () => {
      measure();
      attachClick();
    };

    iframe.addEventListener("load", onLoad);
    attachClick();
    const timers = [
      window.setTimeout(measure, 80),
      window.setTimeout(measure, 320),
      window.setTimeout(measure, 800),
    ];
    return () => {
      iframe.removeEventListener("load", onLoad);
      try {
        iframe.contentDocument?.removeEventListener("click", onClick);
      } catch {
        // ignore
      }
      timers.forEach((t) => window.clearTimeout(t));
    };
  }, [srcDoc, minH]);

  return (
    <iframe
      ref={iframeRef}
      title="Card content"
      sandbox="allow-same-origin"
      srcDoc={srcDoc}
      style={{ height: `${height}px` }}
      className="block w-full border-0 bg-transparent"
    />
  );
}
