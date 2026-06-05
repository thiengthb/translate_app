import { KanjiLayout } from "./components/KanjiLayout";
import { KanjiActionCards } from "./components/KanjiActionCards";
import { KanjiLevelProgress } from "./components/KanjiLevelProgress";
import { KanjiForecastChart } from "./components/KanjiForecastChart";
import { KanjiActivityChart } from "./components/KanjiActivityChart";
import { useKanjiDashboard } from "./hooks/useKanjiDashboard";

/**
 * Kanji Study dashboard — the home of the feature.
 *
 * Layout (Bunpro-inspired):
 *   ┌ in-page header (brand + Content dropdown) ┐
 *   │ two CTAs: study-by-deck  |  SRS review     │
 *   │ progress toward the 2000-kanji goal        │
 *   │ forecast (next 7d)  |  activity (last 14d)  │
 */
export default function KanjiHomePage() {
  const d = useKanjiDashboard();

  return (
    <KanjiLayout>
      <div className="space-y-6">
        {d.isLoading ? (
          <DashboardSkeleton />
        ) : (
          <>
            <KanjiActionCards decks={d.decks} featuredDeck={d.featuredDeck} dueCount={d.dueCount} />

            <KanjiLevelProgress
              levels={d.levels}
              totalLearned={d.totalLearned}
              statusCounts={d.statusCounts}
            />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <KanjiForecastChart data={d.forecast} />
              <KanjiActivityChart data={d.activity} />
            </div>
          </>
        )}
      </div>
    </KanjiLayout>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="h-44 rounded-2xl bg-muted" />
        <div className="h-44 rounded-2xl bg-muted" />
      </div>
      <div className="h-56 rounded-2xl bg-muted" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="h-72 rounded-2xl bg-muted" />
        <div className="h-72 rounded-2xl bg-muted" />
      </div>
    </div>
  );
}
