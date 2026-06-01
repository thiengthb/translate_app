import { MainLayout } from "@/components/layout/MainLayout";
import { GameBoard } from "./GameBoard";

const PATH_NAME = { "/games/kanji-radical": "Bộ Thủ Karuta" };

/**
 * Page shell for the Kanji Radical card game. The immersive board lives in
 * {@link GameBoard}; this just drops it inside the app layout with a title.
 */
export default function KanjiRadicalGamePage() {
    return (
        <MainLayout pathName={PATH_NAME}>
            {/* flex-1 min-h-0 lets the board fill the remaining viewport height
                that MainLayout's ScrollHintContainer allocates to <main>. */}
            <div className="mx-auto flex w-full max-w-6xl flex-1 min-h-0 flex-col">
                <GameBoard />
            </div>
        </MainLayout>
    );
}
