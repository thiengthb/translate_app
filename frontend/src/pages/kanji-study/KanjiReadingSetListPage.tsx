import { useEffect, useState } from "react";
import { ScrollText } from "lucide-react";
import { kanjiReadingSetApi } from "@/api/features/kanji_study";
import type { KanjiReadingSetDTO } from "@/types";
import { KanjiLayout } from "./components/KanjiLayout";
import { Card, CardContent } from "@/components/ui/card";

/**
 * Graded reading sets (KLC-style) listed under Content → Bài đọc.
 * Read-only list for now; opening a set / passage runner is a later slice.
 */
export default function KanjiReadingSetListPage() {
  const [sets, setSets] = useState<KanjiReadingSetDTO[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    kanjiReadingSetApi
      .getPage({ page: 0, size: 100 })
      .then((r) => setSets((r.content ?? []) as KanjiReadingSetDTO[]))
      .catch(() => setSets([]))
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <KanjiLayout pageScroll>
      <div className="pb-8">
        <div className="flex items-center gap-2 mb-1">
          <ScrollText className="text-rose-500" size={22} />
          <h1 className="text-2xl font-bold text-foreground">Bài đọc</h1>
        </div>
        <p className="text-muted-foreground mb-6">Luyện đọc theo cấp độ với Hán tự đã học.</p>

        {isLoading ? (
          <p className="text-muted-foreground">Đang tải...</p>
        ) : sets.length === 0 ? (
          <p className="text-muted-foreground">Chưa có bài đọc nào.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {sets.map((s) => (
              <Card key={s.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-5">
                  {s.level && (
                    <span className="inline-block text-xs font-semibold bg-rose-100 dark:bg-rose-950/40 text-rose-600 px-2 py-0.5 rounded-full mb-2">
                      {s.level}
                    </span>
                  )}
                  <h3 className="font-semibold text-foreground line-clamp-1">{s.title ?? "Bài đọc"}</h3>
                  {s.description && (
                    <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{s.description}</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </KanjiLayout>
  );
}
