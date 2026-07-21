import { MainLayout } from "@/components/layout/MainLayout";
import { GameBoard } from "./GameBoard";

const PATH_NAME = { "/kanji-radical": "Bộ Thủ Karuta" };

/**
 * Page shell for the Kanji Radical card game. The immersive board lives in
 * {@link GameBoard}; this just drops it inside the app layout with a title.
 */
export default function KanjiRadicalGamePage() {
    return (
        <MainLayout pathName={PATH_NAME}>
            {/* Full-bleed: fill the whole width + height <main> gives us (no
                max-width cap), so the karuta table matches the kanji-study
                pages instead of sitting boxed in the middle. */}
            <div className="flex w-full min-w-0 flex-1 min-h-0 flex-col">
                <GameBoard />
            </div>
        </MainLayout>
    );
}
