import { useEffect, useMemo, useState } from "react";
import { Grid, Search } from "lucide-react";
import { kanjiRadicalApi } from "@/api/features/kanji_study";
import type { KanjiRadicalDTO } from "@/types";
import { MainLayout } from "@/components/layout/MainLayout";

/**
 * The 214 Kangxi radicals (bộ thủ) — the classifying components of kanji.
 */
export default function KanjiRadicalListPage() {
  const [radicals, setRadicals] = useState<KanjiRadicalDTO[]>([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setIsLoading(true);
    kanjiRadicalApi
      .getPage({ page: 0, size: 300, sort: "number,asc" }, search)
      .then((r) => setRadicals(r.content ?? (r as any).items ?? []))
      .catch(() => setRadicals([]))
      .finally(() => setIsLoading(false));
  }, [search]);

  const sorted = useMemo(
    () => [...radicals].sort((a, b) => (a.number ?? 0) - (b.number ?? 0)),
    [radicals]
  );

  return (
    <MainLayout>
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex items-center gap-2 mb-1">
          <Grid className="text-violet-500" size={22} />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Bộ thủ</h1>
        </div>
        <p className="text-gray-500 dark:text-gray-400 mb-6">214 bộ thủ Khang Hy — thành phần phân loại Hán tự.</p>

        <div className="relative mb-6 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm bộ thủ..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-violet-400"
          />
        </div>

        {isLoading ? (
          <p className="text-gray-400">Đang tải...</p>
        ) : sorted.length === 0 ? (
          <p className="text-gray-400">Chưa có bộ thủ nào.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {sorted.map((r) => (
              <div
                key={r.id}
                className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-3 flex items-center gap-3"
              >
                <span className="text-3xl font-serif text-gray-900 dark:text-gray-100">{r.character}</span>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                    {r.hanViet ?? `Bộ ${r.number ?? ""}`}
                  </p>
                  {r.meaning && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{r.meaning}</p>
                  )}
                  <p className="text-[11px] text-gray-400">
                    #{r.number} · {r.strokeCount ?? "?"} nét
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
