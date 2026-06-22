import type { ReactNode } from "react";

import { KanjiStudyHeader } from "./KanjiStudyHeader";

/**
 * Dedicated shell for the Kanji-study area.
 *
 * Unlike the shared `MainLayout`, this deliberately renders **no** Hanabun
 * sidebar — the feature has its own in-page nav (`KanjiStudyHeader`) and a
 * "back to Hanabun" exit button. Routes here are already gated by
 * `ProtectedRoute`, so no auth gate is needed at this level.
 *
 * Theming is the fixed light-only Sakura palette set in index.css `:root`;
 * there is no runtime color/typography preset to apply here anymore.
 */
export function KanjiLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-svh bg-background flex flex-col">
      <KanjiStudyHeader />
      <main className="flex-1 w-full max-w-6xl mx-auto px-3 sm:px-4 lg:px-6 py-4">
        {children}
      </main>
    </div>
  );
}
