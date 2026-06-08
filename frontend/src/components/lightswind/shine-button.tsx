import React from "react";

interface ShineButtonProps {
    label?: string;
    children?: React.ReactNode;
    onClick?: () => void;
    type?: "button" | "submit" | "reset";
    className?: string;
    size?: "sm" | "md" | "lg";
    /** Solid hex (e.g. "#f43f5e") or a full `linear-gradient(...)` string. */
    bgColor?: string;
}

const sizeStyles: Record<
    NonNullable<ShineButtonProps["size"]>,
    { padding: string; fontSize: string }
> = {
    sm: { padding: "0.5rem 1rem", fontSize: "0.875rem" },
    md: { padding: "0.6rem 1.4rem", fontSize: "1rem" },
    lg: { padding: "0.8rem 1.8rem", fontSize: "1.125rem" },
};

/**
 * Lightswind "Shine Button" — a gradient pill with an animated sweep on hover.
 *
 * Adapted from `lightswind add` for this project:
 *   - added `group` so the inner `group-hover` shine actually fires (the
 *     `.animate-shine` keyframe lives in index.css),
 *   - added `type` + `children` so it works as a form submit button and can
 *     render an icon next to the label,
 *   - shadow/glow recolored to neutral rose-friendly tones so the default
 *     `bgColor` can be swapped without the blue glow fighting it.
 */
export const ShineButton: React.FC<ShineButtonProps> = ({
    label = "Shine now",
    children,
    onClick,
    type = "button",
    className = "",
    size = "md",
    bgColor = "linear-gradient(325deg, hsl(217 100% 56%) 0%, hsl(194 100% 69%) 55%, hsl(217 100% 56%) 90%)",
}) => {
    const { padding, fontSize } = sizeStyles[size];

    const backgroundImage = bgColor.startsWith("linear-gradient")
        ? bgColor
        : `linear-gradient(to right, ${bgColor}, ${bgColor})`;

    return (
        <button
            type={type}
            onClick={onClick}
            className={`group relative overflow-hidden inline-flex items-center justify-center gap-1.5 text-white font-semibold rounded-full min-h-[44px] transition-all duration-700 ease-in-out
        border-none cursor-pointer shadow-[0px_5px_18px_-2px_rgba(0,0,0,0.35)]
        focus:outline-none focus:ring-2 focus:ring-white/80 focus:ring-offset-2 focus:ring-offset-transparent
        hover:bg-[length:280%_auto] active:scale-95 ${className}`}
            style={{
                backgroundImage,
                backgroundSize: "280% auto",
                backgroundPosition: "initial",
                color: "hsl(0 0% 100%)",
                fontSize,
                padding,
                transition: "0.8s",
            }}
            onMouseEnter={(e) =>
                ((e.currentTarget as HTMLButtonElement).style.backgroundPosition =
                    "right top")
            }
            onMouseLeave={(e) =>
                ((e.currentTarget as HTMLButtonElement).style.backgroundPosition =
                    "initial")
            }
        >
            <span className="relative z-10 inline-flex items-center gap-1.5">
                {children ?? label}
            </span>

            {/* Shine effect — runs while hovering (parent is `group`). */}
            <div
                className="absolute top-0 left-[-75%] w-[200%] h-full bg-white/40 skew-x-[-20deg]
        opacity-0 group-hover:opacity-100 group-hover:animate-shine pointer-events-none z-20"
            />
        </button>
    );
};
