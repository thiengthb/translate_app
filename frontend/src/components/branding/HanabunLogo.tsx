import { useState } from "react";

import { cn } from "@/lib/utils";

/**
 * Hanabun brand mark.
 *
 * Tries the user-supplied logo image at `/hanabun-logo.png` first; if it's
 * not present (or fails to load) it falls back to an inline sakura
 * (cherry-blossom) SVG so the brand never renders broken. Drop a square-ish
 * PNG/WebP at `frontend/public/hanabun-logo.png` to use the real artwork.
 */
export function HanabunMark({ className }: { className?: string }) {
  const [imgFailed, setImgFailed] = useState(false);

  if (!imgFailed) {
    return (
      <img
        src="/hanabun-logo.png"
        alt="Hanabun"
        loading="lazy"
        className={cn("h-full w-full object-contain", className)}
        onError={() => setImgFailed(true)}
        draggable={false}
      />
    );
  }
  return <SakuraMark className={className} />;
}

/** Inline 5-petal sakura blossom — the always-available fallback mark. */
export function SakuraMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      className={cn("h-full w-full", className)}
      fill="none"
      aria-hidden
    >
      {[0, 72, 144, 216, 288].map((deg) => (
        <path
          key={deg}
          transform={`rotate(${deg} 24 24)`}
          // teardrop petal pointing up from the centre, with a soft notch at the tip
          d="M24 23 C16 19 16.5 9 21 4.5 C22.2 6 22.6 6 24 5 C25.4 6 25.8 6 27 4.5 C31.5 9 32 19 24 23 Z"
          fill="#FF8FAB"
          stroke="#FF6B9D"
          strokeWidth="1.1"
          strokeLinejoin="round"
        />
      ))}
      <circle cx="24" cy="24" r="4.4" fill="#FFC95C" />
    </svg>
  );
}

/**
 * Full Hanabun logo: square mark + "Hanabun" wordmark in the display font.
 * Used where a complete lockup is wanted; the shell composes the mark +
 * text itself for finer layout control.
 */
export function HanabunLogo({
  className,
  markClassName,
  showWordmark = true,
}: {
  className?: string;
  markClassName?: string;
  showWordmark?: boolean;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <span
        className={cn(
          "flex items-center justify-center overflow-hidden rounded-[12px] bg-[#FFE5EC] p-1",
          markClassName ?? "h-9 w-9",
        )}
      >
        <HanabunMark />
      </span>
      {showWordmark && (
        <span className="font-display text-lg font-bold text-[#FF6B9D]">
          Hanabun
        </span>
      )}
    </span>
  );
}
