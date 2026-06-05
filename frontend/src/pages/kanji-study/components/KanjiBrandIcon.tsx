import { forwardRef } from "react";
import type { SVGProps } from "react";

/**
 * The 漢 glyph rendered as an inline SVG so it can stand in for a Lucide
 * icon anywhere an `icon` slot expects one (sidebar launcher, header brand).
 * Uses `currentColor` so it inherits the surrounding text color, and scales
 * with the usual `h-4 w-4` / `size` props.
 */
export const KanjiBrandIcon = forwardRef<SVGSVGElement, SVGProps<SVGSVGElement> & { size?: number }>(
  ({ size, width, height, ...props }, ref) => (
    <svg
      ref={ref}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width={size ?? width ?? 24}
      height={size ?? height ?? 24}
      {...props}
    >
      <text
        x="12"
        y="13"
        textAnchor="middle"
        dominantBaseline="central"
        fontSize="20"
        fontFamily="'Noto Serif JP', serif"
        fill="currentColor"
      >
        漢
      </text>
    </svg>
  )
);
KanjiBrandIcon.displayName = "KanjiBrandIcon";
