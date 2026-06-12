import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Clock, Loader2, Search, X } from "lucide-react";
import { kanjiDetailApi, kanjiWordApi } from "@/api/features/kanji_study";
import type { KanjiDetailDTO, KanjiVocabWord } from "@/types";
import { KanjiLayout } from "./components/KanjiLayout";
import {
  addRecentQuery,
  clearRecentQueries,
  formatDay,
  formatDaysAgo,
  getLastSearch,
  getRecentQueries,
  getViewedItems,
  groupViewedByDay,
  removeRecentQuery,
  saveLastSearch,
  type KanjiSearchTab,
  type ViewedItem,
} from "./lib/kanjiSearchHistory";

/**
 * The Kanji-Study search screen (mirrors the mobile app): one input with
 * TỪ VỰNG / CHỮ HÁN tabs. The last query + tab are restored on reopen;
 * an empty query shows recent searches and the recently-viewed history
 * grouped by day.
 */
const DEBOUNCE_MS = 300;
const PAGE_SIZE = 20;

export default function KanjiSearchPage() {
  const navigate = useNavigate();
  const last = useMemo(getLastSearch, []);
  const [query, setQuery] = useState(last.q);
  const [tab, setTab] = useState<KanjiSearchTab>(last.tab);
  const [debounced, setDebounced] = useState(query.trim());
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    saveLastSearch(query, tab);
  }, [query, tab]);

  // Commit a result click: remember the query, then go.
  const open = (path: string) => {
    if (debounced) addRecentQuery(debounced);
    navigate(path);
  };

  return (
    <KanjiLayout>
      <div className="max-w-3xl mx-auto pb-10">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft size={16} /> Quay lại
        </button>

        {/* ── Input ── */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && query.trim()) addRecentQuery(query.trim());
            }}
            placeholder="Tìm từ vựng, chữ Hán, âm đọc, nghĩa..."
            className="w-full pl-10 pr-10 py-3 rounded-xl border border-border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-rose-400"
            lang="ja"
          />
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                inputRef.current?.focus();
              }}
              aria-label="Xóa"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* ── Tabs ── */}
        <div className="flex border-b border-border mb-4">
          {(
            [
              { key: "words", label: "TỪ VỰNG" },
              { key: "kanji", label: "CHỮ HÁN" },
            ] as const
          ).map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`flex-1 py-2.5 text-sm font-semibold tracking-wide transition-colors border-b-2 -mb-px ${
                tab === t.key
                  ? "text-foreground border-rose-500"
                  : "text-muted-foreground border-transparent hover:text-foreground"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {debounced === "" ? (
          <EmptyState onPick={(q) => setQuery(q)} onOpen={open} />
        ) : tab === "words" ? (
          <WordResults query={debounced} onOpen={open} />
        ) : (
          <KanjiResults query={debounced} onOpen={open} />
        )}
      </div>
    </KanjiLayout>
  );
}

// ── Empty state: recent queries + viewed history ───────────────────────────

function EmptyState({
  onPick,
  onOpen,
}: {
  onPick: (q: string) => void;
  onOpen: (path: string) => void;
}) {
  const [queries, setQueries] = useState<string[]>(getRecentQueries);
  const viewedGroups = useMemo(() => groupViewedByDay(getViewedItems()), []);

  return (
    <div className="flex flex-col gap-6">
      {queries.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-semibold text-foreground">Tìm kiếm gần đây</h2>
            <button
              type="button"
              onClick={() => {
                clearRecentQueries();
                setQueries([]);
              }}
              className="text-xs text-muted-foreground hover:text-rose-500"
            >
              Xóa tất cả
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {queries.map((q) => (
              <span
                key={q}
                className="inline-flex items-center gap-1.5 pl-3 pr-1.5 py-1.5 rounded-full border border-border bg-card text-sm text-foreground"
              >
                <button type="button" onClick={() => onPick(q)} className="hover:text-rose-500" lang="ja">
                  {q}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    removeRecentQuery(q);
                    setQueries(getRecentQueries());
                  }}
                  aria-label={`Xóa "${q}"`}
                  className="grid place-items-center h-5 w-5 rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  <X size={12} />
                </button>
              </span>
            ))}
          </div>
        </section>
      )}

      {viewedGroups.length > 0 && (
        <section>
          <h2 className="flex items-center gap-1.5 text-sm font-semibold text-foreground mb-2">
            <Clock size={14} className="text-rose-500" /> Đã xem gần đây
          </h2>
          <div className="flex flex-col gap-4">
            {viewedGroups.map((g) => (
              <div key={g.day.getTime()}>
                <div className="flex items-baseline justify-between px-1 py-1.5 bg-muted/50 rounded-lg mb-1">
                  <span className="text-sm font-semibold text-foreground px-2">{formatDay(g.day)}</span>
                  <span className="text-xs text-muted-foreground px-2">{formatDaysAgo(g.day)}</span>
                </div>
                <div className="flex flex-col divide-y divide-border/60">
                  {g.items.map((item) => (
                    <ViewedRow key={`${item.type}-${item.id}`} item={item} onOpen={onOpen} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {queries.length === 0 && viewedGroups.length === 0 && (
        <p className="text-muted-foreground text-sm text-center py-8">
          Nhập để tìm từ vựng hoặc chữ Hán.
        </p>
      )}
    </div>
  );
}

function ViewedRow({ item, onOpen }: { item: ViewedItem; onOpen: (path: string) => void }) {
  const path = item.type === "word" ? `/kanji-study/word/${item.id}` : `/kanji-study/kanji/${item.id}`;
  return (
    <button
      type="button"
      onClick={() => onOpen(path)}
      className="w-full flex items-center gap-3 py-2.5 px-2 text-left hover:bg-muted/60 rounded-lg transition-colors"
    >
      <span
        className={`text-2xl font-serif leading-none shrink-0 ${
          item.type === "kanji" ? "text-rose-600 dark:text-rose-400" : "text-foreground"
        }`}
        lang="ja"
      >
        {item.label}
      </span>
      {item.sub && <span className="text-sm text-muted-foreground truncate">{item.sub}</span>}
    </button>
  );
}

// ── Word results ────────────────────────────────────────────────────────────

function WordResults({ query, onOpen }: { query: string; onOpen: (path: string) => void }) {
  const [items, setItems] = useState<KanjiVocabWord[]>([]);
  const [page, setPage] = useState(0);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setItems([]);
    setPage(0);
    kanjiWordApi
      .search(query, 0, PAGE_SIZE)
      .then((res) => {
        if (cancelled) return;
        setItems(res.items ?? []);
        setTotalItems(res.totalItems ?? 0);
        setTotalPages(res.totalPages ?? 0);
      })
      .catch(() => !cancelled && setItems([]))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [query]);

  const loadMore = async () => {
    const next = page + 1;
    const res = await kanjiWordApi.search(query, next, PAGE_SIZE);
    setItems((prev) => [...prev, ...(res.items ?? [])]);
    setPage(next);
  };

  if (loading) return <Spinner />;
  if (items.length === 0)
    return <p className="text-muted-foreground text-sm py-6 text-center">Không tìm thấy từ vựng nào.</p>;

  return (
    <div>
      <p className="text-xs text-muted-foreground mb-2">{totalItems} kết quả</p>
      <div className="flex flex-col divide-y divide-border/60">
        {items.map((w) => (
          <button
            key={w.id}
            type="button"
            onClick={() => onOpen(`/kanji-study/word/${w.id}`)}
            className="w-full py-3 px-2 text-left hover:bg-muted/60 rounded-lg transition-colors"
          >
            <span className="flex items-baseline gap-2">
              <span className="text-lg font-medium text-foreground" lang="ja">
                {w.word}
              </span>
              {w.reading && (
                <span className="text-sm text-muted-foreground" lang="ja">
                  【{w.reading}】
                </span>
              )}
              {w.levelCode && w.levelCode !== "KHAC" && (
                <span className="ml-auto shrink-0 px-1.5 py-0.5 rounded text-[10px] font-bold bg-muted text-muted-foreground">
                  {w.levelCode}
                </span>
              )}
            </span>
            {w.meaningText && (
              <span className="block text-sm text-muted-foreground truncate">{w.meaningText}</span>
            )}
          </button>
        ))}
      </div>
      {page + 1 < totalPages && <LoadMore onClick={loadMore} shown={items.length} total={totalItems} />}
    </div>
  );
}

// ── Kanji results ───────────────────────────────────────────────────────────

function KanjiResults({ query, onOpen }: { query: string; onOpen: (path: string) => void }) {
  const [items, setItems] = useState<KanjiDetailDTO[]>([]);
  const [page, setPage] = useState(0);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setItems([]);
    setPage(0);
    kanjiDetailApi
      .getPage({ page: 0, size: PAGE_SIZE }, query)
      .then((res) => {
        if (cancelled) return;
        setItems((res.content ?? (res as any).items ?? []) as KanjiDetailDTO[]);
        setTotalItems(res.totalElements ?? 0);
        setTotalPages(res.totalPages ?? 0);
      })
      .catch(() => !cancelled && setItems([]))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [query]);

  const loadMore = async () => {
    const next = page + 1;
    const res = await kanjiDetailApi.getPage({ page: next, size: PAGE_SIZE }, query);
    setItems((prev) => [...prev, ...((res.content ?? (res as any).items ?? []) as KanjiDetailDTO[])]);
    setPage(next);
  };

  if (loading) return <Spinner />;
  if (items.length === 0)
    return <p className="text-muted-foreground text-sm py-6 text-center">Không tìm thấy chữ Hán nào.</p>;

  return (
    <div>
      <p className="text-xs text-muted-foreground mb-2">{totalItems} kết quả</p>
      <div className="flex flex-col divide-y divide-border/60">
        {items.map((k) => (
          <button
            key={k.id}
            type="button"
            onClick={() => onOpen(`/kanji-study/kanji/${k.id}`)}
            className="w-full flex items-center gap-4 py-3 px-2 text-left hover:bg-muted/60 rounded-lg transition-colors"
          >
            <span className="relative shrink-0">
              <span className="text-4xl font-serif text-rose-600 dark:text-rose-400 leading-none" lang="ja">
                {k.character}
              </span>
              {k.jlptLevel && k.jlptLevel !== "KHAC" && (
                <span className="absolute -top-1.5 -left-3 text-[10px] font-semibold text-muted-foreground">
                  {k.jlptLevel}
                </span>
              )}
            </span>
            <span className="min-w-0 flex-1">
              {(k.onyomi || k.kunyomi) && (
                <span className="block text-sm text-muted-foreground truncate" lang="ja">
                  {[k.onyomi, k.kunyomi].filter(Boolean).join(" · ")}
                </span>
              )}
              {k.meaning && (
                <span className="block text-sm font-medium text-foreground truncate">{k.meaning}</span>
              )}
            </span>
          </button>
        ))}
      </div>
      {page + 1 < totalPages && <LoadMore onClick={loadMore} shown={items.length} total={totalItems} />}
    </div>
  );
}

// ── Shared bits ─────────────────────────────────────────────────────────────

function Spinner() {
  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground py-6 justify-center">
      <Loader2 size={16} className="animate-spin" /> Đang tìm...
    </div>
  );
}

function LoadMore({ onClick, shown, total }: { onClick: () => void; shown: number; total: number }) {
  return (
    <button
      onClick={onClick}
      className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-rose-600 dark:text-rose-400 hover:underline"
    >
      Tải thêm ({shown}/{total})
    </button>
  );
}
