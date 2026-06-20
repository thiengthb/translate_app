/**
 * Speak Japanese text via the browser's Web Speech API.
 *
 * `speechSynthesis.getVoices()` is empty on first call in most browsers until the
 * `voiceschanged` event fires — so we cache the picked voice and refresh it on that
 * event. `utterance.lang = "ja-JP"` is set regardless as a fallback, so the first
 * click still reads (just possibly with the default voice) before voices load.
 */

let cachedVoice: SpeechSynthesisVoice | null = null;

function pickJaVoice(): SpeechSynthesisVoice | null {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return null;
  return window.speechSynthesis.getVoices().find((v) => v.lang.startsWith("ja")) ?? null;
}

if (typeof window !== "undefined" && "speechSynthesis" in window) {
  cachedVoice = pickJaVoice();
  window.speechSynthesis.addEventListener("voiceschanged", () => {
    cachedVoice = pickJaVoice();
  });
}

export function speakJa(text: string) {
  if (typeof window === "undefined" || !("speechSynthesis" in window) || !text.trim()) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "ja-JP";
  const voice = cachedVoice ?? pickJaVoice();
  if (voice) u.voice = voice;
  window.speechSynthesis.speak(u);
}

/** Stop any in-flight speech — call on unmount so audio doesn't bleed across pages. */
export function stopJa() {
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    window.speechSynthesis.cancel();
  }
}
