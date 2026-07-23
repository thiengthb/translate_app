import { useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { Search } from "lucide-react";

import { Input } from "@/components/ui/input";

import { GuestSidebar, type GuestTab } from "./GuestSidebar";
import { GuestDashboard } from "./GuestDashboard";
import { WordSearchPanel } from "./panels/WordSearchPanel";
import { TranslatePanel } from "./panels/TranslatePanel";
import { GuestFeatured } from "./panels/GuestFeatured";

const TABS: GuestTab[] = ["dashboard", "word", "translate"];
const SEARCH_TABS: GuestTab[] = ["word"];

const HEADINGS: Record<Exclude<GuestTab, "dashboard">, { title: string; subtitle: string; placeholder?: string }> = {
    word: {
        title: "Tra từ vựng",
        subtitle: "Tìm từ tiếng Nhật theo kanji, kana, romaji hoặc nghĩa tiếng Việt.",
        placeholder: "Tra từ: kanji, kana, romaji hoặc nghĩa tiếng Việt…",
    },
    translate: {
        title: "Dịch thuật",
        subtitle: "Dịch Việt ↔ Nhật kèm romaji và phân tích ngữ pháp JLPT.",
    },
};

export default function GuestToolsPage() {
    const [params, setParams] = useSearchParams();

    const rawTab = params.get("tab") as GuestTab | null;
    const tab: GuestTab = rawTab && TABS.includes(rawTab) ? rawTab : "dashboard";
    const q = params.get("q") ?? "";

    const setTab = useCallback(
        (next: GuestTab) => {
            setParams(
                (prev) => {
                    const p = new URLSearchParams(prev);
                    if (next === "dashboard") p.delete("tab");
                    else p.set("tab", next);
                    p.delete("q");
                    return p;
                },
                { replace: true },
            );
        },
        [setParams],
    );

    const setQuery = useCallback(
        (value: string) => {
            setParams(
                (prev) => {
                    const p = new URLSearchParams(prev);
                    if (value) p.set("q", value);
                    else p.delete("q");
                    return p;
                },
                { replace: true },
            );
        },
        [setParams],
    );

    const showSearchBox = SEARCH_TABS.includes(tab);

    return (
        <div className="min-h-screen bg-background px-2 pb-2 sm:px-4 sm:pb-4 lg:px-8 lg:pb-8">
            <div className="mx-auto flex w-full max-w-[1600px] flex-col">
                {/* Top brand header — mirrors the authenticated shell */}
                <div className="flex h-14 w-full shrink-0 items-center sm:h-16 lg:h-[90px]">
                    <img
                        src="/hanabun-logo-full.png"
                        alt="Hanabun"
                        draggable={false}
                        className="h-full w-auto shrink-0 select-none object-contain object-left py-[5px]"
                    />
                </div>

                <div className="mt-[15px] flex w-full">
                    <div className="flex min-w-0 flex-1 flex-col rounded-[36px] bg-white shadow-[0_18px_50px_rgba(255,143,171,0.16)] lg:flex-row">
                        <GuestSidebar tab={tab} onTabChange={setTab} />

                        <main className="min-w-0 flex-1 px-5 pb-10 pt-6 sm:px-8 lg:px-10 lg:pt-8">
                            {tab === "dashboard" ? (
                                <GuestDashboard />
                            ) : (
                                <div className="mx-auto flex w-full max-w-3xl flex-col">
                                    <div className="mb-5">
                                        <h1 className="font-display text-2xl font-bold text-[#3A2E33]">
                                            {HEADINGS[tab].title}
                                        </h1>
                                        <p className="mt-1 text-sm text-muted-foreground">
                                            {HEADINGS[tab].subtitle}
                                        </p>
                                    </div>

                                    {showSearchBox && (
                                        <div className="relative mb-5">
                                            <Search
                                                size={18}
                                                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                                            />
                                            <Input
                                                autoFocus
                                                value={q}
                                                onChange={(e) => setQuery(e.target.value)}
                                                placeholder={HEADINGS[tab].placeholder}
                                                className="h-12 pl-10 text-base"
                                            />
                                        </div>
                                    )}

                                    {tab === "word" &&
                                        (q.trim() ? (
                                            <WordSearchPanel query={q} />
                                        ) : (
                                            <GuestFeatured onPick={setQuery} />
                                        ))}
                                    {tab === "translate" && <TranslatePanel />}
                                </div>
                            )}
                        </main>
                    </div>
                </div>
            </div>
        </div>
    );
}
