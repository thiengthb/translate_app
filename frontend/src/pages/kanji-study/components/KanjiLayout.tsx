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
export function KanjiLayout({ children }: { children: ReactNode }) {
  return (
    <MainLayout
      pathName={{ "/kanji-study": "Học Kanji" }}
      headerExtra={<KanjiContentNav />}
    >
      <div className="mx-auto w-full max-w-6xl">{children}</div>
    </MainLayout>
  );
}
