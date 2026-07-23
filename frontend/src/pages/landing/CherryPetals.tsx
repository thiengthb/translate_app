import { useMemo } from "react";

/**
 * Randomised falling cherry-blossom petals for the login stage.
 *
 * Uses the ORIGINAL petal artwork — individual petals/blossoms cropped out of
 * the template's `petals.png` (see `public/cherry/petals/`) — so they match
 * the design exactly. Each is spawned at a random x-position with random size,
 * fall speed, start phase, sway and spin, so they drift down continuously in
 * no fixed order and loop forever. Because every petal is a whole cropped
 * sprite (never a masked slice of a bigger image), none get clipped mid-petal.
 *
 * Motion is all CSS (see `.cherry-petal*` in cherry-login.css); this only
 * seeds per-petal random parameters as CSS custom properties.
 */

const PETAL_COUNT = 22;

/** Real cropped sprites. Single petals appear more often than full blossoms. */
const SPRITES = [
    "petal-a",
    "petal-d",
    "petal-a",
    "petal-d",
    "petal-a",
    "petal-d",
    "bloom-a",
    "bloom-b",
    "bloom-c",
];

export function CherryPetals() {
    const petals = useMemo(
        () =>
            Array.from({ length: PETAL_COUNT }, (_, i) => {
                const sprite = SPRITES[Math.floor(Math.random() * SPRITES.length)];
                const isBloom = sprite.startsWith("bloom");
                return {
                    key: i,
                    sprite,
                    size: isBloom ? 18 + Math.random() * 16 : 12 + Math.random() * 16, // px
                    left: Math.random() * 100, // vw start
                    drift: (Math.random() * 2 - 1) * 8, // vw net horizontal drift
                    sway: 14 + Math.random() * 34, // px sway amplitude
                    fallDur: 9 + Math.random() * 10, // s
                    swayDur: 2.5 + Math.random() * 3, // s
                    spinDur: 3 + Math.random() * 6, // s
                    delay: -(Math.random() * 20), // s (negative → start mid-cycle)
                    spin: (Math.random() < 0.5 ? -1 : 1) * (180 + Math.random() * 360), // deg
                    opacity: 0.72 + Math.random() * 0.28,
                };
            }),
        [],
    );

    return (
        <div className="cherry-petals" aria-hidden>
            {petals.map((p) => (
                <span
                    key={p.key}
                    className="cherry-petal"
                    style={
                        {
                            left: `${p.left}vw`,
                            opacity: p.opacity,
                            "--fall-dur": `${p.fallDur}s`,
                            "--delay": `${p.delay}s`,
                            "--drift": `${p.drift}vw`,
                        } as React.CSSProperties
                    }
                >
                    <span
                        className="cherry-petal-sway"
                        style={
                            {
                                "--sway": `${p.sway}px`,
                                "--sway-dur": `${p.swayDur}s`,
                                "--delay": `${p.delay}s`,
                            } as React.CSSProperties
                        }
                    >
                        <img
                            className="cherry-petal-spin"
                            src={`/cherry/petals/${p.sprite}.png`}
                            alt=""
                            draggable={false}
                            style={
                                {
                                    width: `${p.size}px`,
                                    "--spin": `${p.spin}deg`,
                                    "--spin-dur": `${p.spinDur}s`,
                                    "--delay": `${p.delay}s`,
                                } as React.CSSProperties
                            }
                        />
                    </span>
                </span>
            ))}
        </div>
    );
}
