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
            <div className="mx-auto flex w-full max-w-6xl flex-col gap-4">
                <header className="flex flex-col gap-1">
                    <h1
                        className="text-2xl font-bold text-foreground sm:text-3xl"
                        style={{ fontFamily: '"Space Grotesk", "Segoe UI", sans-serif' }}
                    >
                        部首 — Bộ Thủ Karuta
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        Cho một từ Hán-Việt (kèm hiragana) — hãy đánh ra các lá bài chứa
                        bộ thủ tạo nên chữ Kanji đó để ghi điểm.
                    </p>
                </header>

                <GameBoard />
            </div>
        </MainLayout>
    );
}
