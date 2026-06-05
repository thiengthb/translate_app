/**
 * Tiny Web-Audio SFX — no asset files, synthesised on the fly. Every call is
 * a no-op when muted or before the user has interacted (browsers block audio
 * until a gesture). Kept deliberately soft.
 */
import { logger } from "@/lib/logger";

type Sfx = "select" | "play" | "correct" | "fail" | "chain" | "win" | "lose";

let ctx: AudioContext | null = null;
let muted = false;

export function setMuted(value: boolean) {
    muted = value;
}

export function isMuted() {
    return muted;
}

function getCtx(): AudioContext | null {
    if (typeof window === "undefined") return null;
    try {
        if (!ctx) {
            const Ctor =
                window.AudioContext ||
                (window as unknown as { webkitAudioContext?: typeof AudioContext })
                    .webkitAudioContext;
            if (!Ctor) return null;
            ctx = new Ctor();
        }
        if (ctx.state === "suspended") void ctx.resume();
        return ctx;
    } catch (e) {
        logger.warn("[kanji-game] audio unavailable", e);
        return null;
    }
}

function blip(
    freq: number,
    durMs: number,
    type: OscillatorType = "sine",
    gain = 0.05,
    delayMs = 0,
) {
    const audio = getCtx();
    if (!audio) return;
    const start = audio.currentTime + delayMs / 1000;
    const osc = audio.createOscillator();
    const g = audio.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, start);
    g.gain.setValueAtTime(0, start);
    g.gain.linearRampToValueAtTime(gain, start + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, start + durMs / 1000);
    osc.connect(g).connect(audio.destination);
    osc.start(start);
    osc.stop(start + durMs / 1000 + 0.02);
}

export function playSfx(sfx: Sfx) {
    if (muted) return;
    switch (sfx) {
        case "select":
            blip(520, 70, "triangle", 0.035);
            break;
        case "play":
            blip(440, 90, "sine", 0.045);
            break;
        case "correct":
            blip(660, 110, "sine", 0.05);
            blip(880, 120, "sine", 0.04, 70);
            break;
        case "fail":
            blip(200, 180, "sawtooth", 0.04);
            break;
        case "chain":
            blip(740, 90, "triangle", 0.045);
            blip(990, 110, "triangle", 0.04, 60);
            break;
        case "win":
            [523, 659, 784, 1047].forEach((f, i) =>
                blip(f, 220, "triangle", 0.05, i * 120),
            );
            break;
        case "lose":
            [392, 330, 262].forEach((f, i) =>
                blip(f, 260, "sine", 0.05, i * 150),
            );
            break;
    }
}
