import { useQuery } from "@tanstack/react-query";

import { dictionaryApi } from "@/api/features/dictionary.api";
import { Card } from "@/components/ui/card";
import { LevelBadge } from "../guest-ui";

/**
 * Trạng thái rỗng của trang tra cứu (khi chưa nhập gì) — gợi ý vài từ & kanji
 * nổi bật để guest bấm thử. Bấm vào sẽ điền sẵn ô tìm kiếm qua `onPick`.
 */
export function GuestFeatured({ onPick }: { onPick: (term: string) => void }) {
    const { data } = useQuery({
        queryKey: ["guest-featured"],
        queryFn: () => dictionaryApi.featured(8, 12),
        staleTime: 10 * 60 * 1000,
        retry: false,
    });

    if (!data || (data.words.length === 0 && data.kanjis.length === 0)) {
        return (
            <p className="py-8 text-center text-sm text-muted-foreground">
                Nhập từ, kanji hoặc câu tiếng Nhật/tiếng Việt để bắt đầu tra cứu.
            </p>
        );
    }

    return (
        <div className="flex flex-col gap-6">
            {data.words.length > 0 && (
                <section>
                    <h2 className="mb-2 text-sm font-semibold text-muted-foreground">
                        Từ vựng gợi ý
                    </h2>
                    <div className="flex flex-wrap gap-2">
                        {data.words.map((w) => (
                            <button
                                key={w.id}
                                type="button"
                                onClick={() => onPick(w.word)}
                                className="rounded-lg border px-3 py-1.5 text-left transition-colors hover:border-primary hover:bg-accent/40"
                            >
                                <span className="font-medium">{w.word}</span>
                                {w.reading && w.reading !== w.word && (
                                    <span className="ml-1.5 text-xs text-muted-foreground">
                                        {w.reading}
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>
                </section>
            )}

            {data.kanjis.length > 0 && (
                <section>
                    <h2 className="mb-2 text-sm font-semibold text-muted-foreground">
                        Kanji gợi ý
                    </h2>
                    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
                        {data.kanjis.map((k) => (
                            <Card
                                key={k.character}
                                onClick={() => onPick(k.character)}
                                className="flex cursor-pointer flex-col items-center gap-1 p-3 transition-colors hover:border-primary hover:bg-accent/40"
                            >
                                <span className="text-3xl font-bold leading-none">
                                    {k.character}
                                </span>
                                {k.meaning && (
                                    <span className="line-clamp-1 text-center text-xs text-muted-foreground">
                                        {k.meaning}
                                    </span>
                                )}
                                <LevelBadge level={k.jlptLevel} />
                            </Card>
                        ))}
                    </div>
                </section>
            )}
        </div>
    );
}
