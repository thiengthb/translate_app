import type { ReactNode } from "react";

import { MainLayout } from "@/components/layout/MainLayout";
import { KanjiContentNav } from "./KanjiStudyHeader";

/**
 * Shell for the Kanji-study area.
 *
 * Uses the shared {@link MainLayout} so the Kanji pages get the same Hanabun
 * sidebar + rounded shell + top bar as every other page. The feature's own
 * sub-nav (Decks / Bộ Thủ / Bài đọc) rides in the top bar via `headerExtra`
 * ({@link KanjiContentNav}); global nav + exit-to-home are handled by the
 * shared sidebar.
 *
 * Content stays centered at `max-w-6xl` to preserve the Kanji area's reading
 * width inside the wider shell.
 */
export function KanjiLayout({
  children,
  pageScroll,
  hideNav = false,
}: {
  children: ReactNode;
  /** Let the whole document scroll (like Dashboard) instead of the default
   *  fixed-viewport frame with internal scroll. Only the Kanji home page
   *  (dashboard-style cards, no ProTable) uses this. */
  pageScroll?: boolean;
  /** In-exercise "focus" mode: drop the shared sidebar/top-bar chrome so the
   *  only way out is the page's own back control (quiz / writing / detail
   *  focus). Renders a bare full-screen frame with the themed background. */
  hideNav?: boolean;
}) {
  if (hideNav) {
    return (
      <div className="min-h-svh bg-background flex flex-col">
        <main className="flex-1 w-full max-w-6xl mx-auto px-3 sm:px-4 lg:px-6 py-4">
          {children}
        </main>
      </div>
    );
  }

  return (
    <MainLayout
      pathName={{ "/kanji-study": "Học Kanji" }}
      headerExtra={<KanjiContentNav />}
      pageScroll={pageScroll}
    >
      <div className="mx-auto w-full max-w-6xl">{children}</div>
    </MainLayout>
  );
}
