import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, GitFork, PenLine } from "lucide-react";
import { kanjiDetailApi, kanjiReadingApi, kanjiRadicalApi } from "@/api/features/kanji_study";
import type { KanjiDetailDTO, KanjiReadingDTO, KanjiRadicalDTO } from "@/types";
import { KanjiLayout } from "./components/KanjiLayout";
import { KanjiStrokeAnimator } from "./components/KanjiStrokeAnimator";
import { KanjiChietTu } from "./components/KanjiChietTu";
import { KanjiDeckStrip } from "./components/KanjiDeckStrip";
import { KanjiVariantLinks } from "./components/KanjiVariantLinks";
import { KanjiVocabularySections } from "./components/KanjiVocabularySections";
import { parseKvg, hasDecomposition } from "./components/kanjiVg";

/**
 * Detail view of a single kanji (the Kanji-Study master record): character,
 * readings, meaning, KanjiVG stroke-order animation, the "chiết tự" component
 * breakdown, radical, and form/etymology notes. Opened from the deck grid.
 */
export default function KanjiDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const deckId = searchParams.get("deck");

  const [kanji, setKanji] = useState<KanjiDetailDTO | null>(null);
  const [readings, setReadings] = useState<KanjiReadingDTO[]>([]);
  const [radical, setRadical] = useState<KanjiRadicalDTO | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setIsLoading(true);

    (async () => {
      try {
        const k = await kanjiDetailApi.getById(id).catch(() => null);
        if (!cancelled) setKanji(k);

        const readingRes = await kanjiReadingApi.getPage(
          { page: 0, size: 50 },
          undefined,
          { kanjiId: Number(id) } as never
        );
        const list = (readingRes.content ?? (readingRes as any).items ?? []) as KanjiReadingDTO[];
        list.sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0));
        if (!cancelled) setReadings(list);

        if (k?.radicalId != null) {
          const r = await kanjiRadicalApi.getById(String(k.radicalId)).catch(() => null);
          if (!cancelled) setRadical(r);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [id]);

  const hanViet = readings.filter((r) => r.readingType === "HAN_VIET").map((r) => r.value).filter(Boolean);
  const nanori = readings.filter((r) => r.readingType === "NANORI").map((r) => r.value).filter(Boolean);
  const variants = readings
    .filter((r) => r.readingType === "VARIANT")
    .map((r) => r.value)
    .filter((v): v is string => !!v);
  const kvg = parseKvg(kanji?.strokeData);

  const Row = ({ label, value }: { label: string; value?: string | number | null }) =>
    value == null || value === "" ? null : (
      <div className="flex gap-3 py-2 border-b border-border/60">
        <span className="w-32 shrink-0 text-sm font-medium text-muted-foreground">{label}</span>
        <span className="text-foreground">{value}</span>
      </div>
    );

  return (
    <KanjiLayout>
      <div className="max-w-3xl mx-auto pb-10">
        {deckId && <KanjiDeckStrip deckId={deckId} currentId={id ? Number(id) : undefined} />}

        <button
          onClick={() => (deckId ? navigate(`/kanji-study/deck/${deckId}`) : navigate(-1))}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft size={16} /> {deckId ? "Tất cả Hán tự" : "Quay lại"}
        </button>

        {isLoading ? (
          <p className="text-muted-foreground">Đang tải...</p>
        ) : !kanji ? (
          <p className="text-muted-foreground">Không tìm thấy Hán tự.</p>
        ) : (
          <div className="flex flex-col gap-6">
            {/* ── Header: character + readings ── */}
            <div className="flex flex-col sm:flex-row gap-6">
              <div className="shrink-0 self-center sm:self-start">
                <div className="w-40 h-40 rounded-3xl bg-gradient-to-br from-rose-500 to-rose-600 flex items-center justify-center shadow-sm">
                  <span className="text-7xl font-serif text-white">{kanji.character}</span>
                </div>
              </div>

              <div className="flex-1">
                {kanji.meaning && (
                  <h1 className="text-xl font-bold text-foreground mb-3">{kanji.meaning}</h1>
                )}
                <Row label="Onyomi (音)" value={kanji.onyomi} />
                <Row label="Kunyomi (訓)" value={kanji.kunyomi} />
                <Row label="Hán-Việt" value={hanViet.join("、")} />
                <Row label="Nanori" value={nanori.join("、")} />
                <Row label="Số nét" value={kanji.strokeCount} />
                <Row
                  label="Bộ thủ"
                  value={radical ? `${radical.character}${radical.hanViet ? ` (${radical.hanViet})` : ""}` : undefined}
                />
                <Row label="Cấp độ" value={kanji.jlptLevel === "KHAC" ? undefined : kanji.jlptLevel} />
                <KanjiVariantLinks variants={variants} />
              </div>
            </div>

            {/* ── Stroke order + Chiết tự ── */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Section icon={<PenLine size={16} className="text-rose-500" />} title="Thứ tự nét">
                <KanjiStrokeAnimator
                  character={kanji.character ?? ""}
                  strokeData={kanji.strokeData}
                  viewBox={kanji.svgViewbox}
                />
              </Section>

              {hasDecomposition(kvg?.tree ?? null) && (
                <Section icon={<GitFork size={16} className="text-rose-500" />} title="Chiết tự">
                  <KanjiChietTu tree={kvg?.tree ?? null} />
                </Section>
              )}
            </div>

            {/* ── Notes ── */}
            {(kanji.formExplanation || kanji.etymology) && (
              <Section title="Giải nghĩa hình thể">
                <div className="space-y-3">
                  {kanji.formExplanation && (
                    <p className="text-sm text-foreground leading-relaxed">{kanji.formExplanation}</p>
                  )}
                  {kanji.etymology && (
                    <p className="text-sm text-muted-foreground leading-relaxed">{kanji.etymology}</p>
                  )}
                </div>
              </Section>
            )}

            {/* ── Vocabulary-driven sections (examples / recommended / full list) ── */}
            {kanji.character && <KanjiVocabularySections character={kanji.character} />}
          </div>
        )}
      </div>
    </KanjiLayout>
  );
}

function Section({
  icon,
  title,
  children,
}: {
  icon?: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border bg-card p-4">
      <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground mb-3">
        {icon}
        {title}
      </h2>
      {children}
    </section>
  );
}
