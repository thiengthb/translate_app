import { dictionaryApi } from "@/api/features/dictionary.api";
import type { KanjiBreakdownData, KanjiBreakdownComponent } from "./KanjiBreakdown";

const KVG_NS = "http://kanjivg.tagaini.net";

// ── Caches ────────────────────────────────────────────────────────────
const breakdownCache    = new Map<string, KanjiBreakdownData | null>();
const meaningCache      = new Map<string, string>();
const inflightBreakdown = new Map<string, Promise<KanjiBreakdownData | null>>();

// ── Helpers ───────────────────────────────────────────────────────────
function toHex5(char: string) {
    return char.codePointAt(0)!.toString(16).padStart(5, "0");
}

function getKvg(el: Element, name: string): string | null {
    return el.getAttributeNS(KVG_NS, name) ?? el.getAttribute(`kvg:${name}`);
}

// ── Parse KanjiVG SVG → tree (no meanings yet) ────────────────────────
function parseTreeFromSvg(svgText: string, kanji: string): KanjiBreakdownData | null {
    const doc = new DOMParser().parseFromString(svgText, "image/svg+xml");
    if (doc.querySelector("parsererror")) return null;

    const allG = Array.from(doc.querySelectorAll("g"));
    const rootG = allG.find((g) => getKvg(g, "element") === kanji);
    if (!rootG) return null;

    let idCounter = 0;
    const newId = () => `n${idCounter++}`;
    const components: KanjiBreakdownComponent[] = [];
    const edges: [string, string][] = [];

    const rootId = newId();
    components.push({ id: rootId, char: kanji, meaning: "" });

    function visit(elem: Element, parentId: string) {
        for (const child of Array.from(elem.children)) {
            if (child.tagName.toLowerCase() !== "g") continue;
            const elemChar = getKvg(child, "element");
            if (!elemChar) continue;
            const id = newId();
            components.push({ id, char: elemChar, meaning: "" });
            edges.push([parentId, id]);
            visit(child, id);
        }
    }
    visit(rootG, rootId);

    if (components.length <= 1) return null; // root only, no breakdown to show

    return { kanji, rootId, components, edges };
}

// ── Look up Vietnamese meanings (with cache + dedup) ──────────────────
async function fillMeanings(data: KanjiBreakdownData) {
    const uniqueChars = Array.from(
        new Set(
            data.components
                .filter((c) => c.id !== data.rootId)
                .map((c) => c.char),
        ),
    );

    await Promise.all(
        uniqueChars.map(async (char) => {
            if (meaningCache.has(char)) return;
            try {
                const results = await dictionaryApi.kanjiSearch(char, 3);
                const hit = results.find((r) => r.character === char) ?? results[0];
                meaningCache.set(char, hit?.meaning ?? "");
            } catch {
                meaningCache.set(char, "");
            }
        }),
    );

    for (const c of data.components) {
        if (c.id !== data.rootId) c.meaning = meaningCache.get(c.char) ?? "";
    }
}

// ── Public: fetch breakdown for a kanji ───────────────────────────────
export async function fetchKanjiBreakdown(character: string): Promise<KanjiBreakdownData | null> {
    if (!character) return null;
    if (breakdownCache.has(character)) return breakdownCache.get(character)!;
    if (inflightBreakdown.has(character)) return inflightBreakdown.get(character)!;

    const promise = (async () => {
        try {
            const url = `https://cdn.jsdelivr.net/gh/KanjiVG/kanjivg@master/kanji/${toHex5(character)}.svg`;
            const res = await fetch(url);
            if (!res.ok) {
                breakdownCache.set(character, null);
                return null;
            }
            const xml = await res.text();
            const data = parseTreeFromSvg(xml, character);
            if (!data) {
                breakdownCache.set(character, null);
                return null;
            }
            await fillMeanings(data);
            breakdownCache.set(character, data);
            return data;
        } catch {
            breakdownCache.set(character, null);
            return null;
        } finally {
            inflightBreakdown.delete(character);
        }
    })();

    inflightBreakdown.set(character, promise);
    return promise;
}