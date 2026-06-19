import type { ReactNode } from "react";

import { useColorPreset } from "@/hooks/useColorPreset";
import { useTypography } from "@/hooks/useTypography";
import { KanjiStudyHeader } from "./KanjiStudyHeader";

/**
 * Dedicated shell for the Kanji-study area.
 *
 * Unlike the shared `MainLayout`, this deliberately renders **no** GENGO
 * sidebar — the feature has its own in-page nav (`KanjiStudyHeader`) and a
 * "back to Gengo" exit button. Routes here are already gated by
 * `ProtectedRoute`, so no auth gate is needed at this level.
 *
 * Color-preset + typography hooks are still applied so the theme is correct
 * even when the user deep-links straight into a kanji page.
 */
export function KanjiLayout({ children, hideNav = false }: { children: ReactNode; hideNav?: boolean }) {
  useColorPreset();
  useTypography();

  return (
    <div className="min-h-svh bg-background flex flex-col">
      {/* `hideNav` is the in-exercise "focus" mode: no header so the only way
          out is the page's own "back to question" control. */}
      {!hideNav && <KanjiStudyHeader />}
      <main className="flex-1 w-full max-w-6xl mx-auto px-3 sm:px-4 lg:px-6 py-4">
        {children}
      </main>
    </div>
  );
}
