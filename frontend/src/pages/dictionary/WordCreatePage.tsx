import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { toast } from "sonner";
import {
    Plus, Trash2, Save, Loader2, Languages, MessageSquareText, BookText,
} from "lucide-react";
import { MainLayout } from "@/components/layout/MainLayout";
import { languageApi, levelApi, representationApi, wordApi, wordTypeApi } from "@/api";
import type {
    LanguageDTO, LevelDTO, RepresentationDTO, WordCreateRequest, WordTypeDTO,
} from "@/types";
import type { ValidationErrorResponse } from "@/types/common/error";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { InfoCard } from "@/components/common/InfoCard";
import { InfoLabel } from "@/components/common/InfoLabel";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

// ── Helpers ─────────────────────────────────────────────────────────────
const findLangId = (langs: LanguageDTO[], codes: string[]): number | undefined =>
    langs.find((l) => l.code && codes.includes(l.code.toLowerCase()))?.id;

interface MeaningRow { languageId?: number; name: string }
interface ExampleRow { rootLanguageId?: number; toLanguageId?: number; rootExample: string; toExample: string }

// ══════════════════════════════════════════════════════════════════════
// Page
// ══════════════════════════════════════════════════════════════════════
export default function WordCreatePage() {
    const navigate = useNavigate();
    const qc = useQueryClient();

    // ── Load relation options ──
    const { data: languages = [] } = useQuery({
        queryKey: ["word-create-options", "languages"],
        queryFn: async () => (await languageApi.getPage({ page: 0, size: 9999 })).content as LanguageDTO[],
        staleTime: 5 * 60 * 1000,
    });
    const { data: levels = [] } = useQuery({
        queryKey: ["word-create-options", "levels"],
        queryFn: async () => (await levelApi.getPage({ page: 0, size: 9999 })).content as LevelDTO[],
        staleTime: 5 * 60 * 1000,
    });
    const { data: representations = [] } = useQuery({
        queryKey: ["word-create-options", "representations"],
        queryFn: async () => (await representationApi.getPage({ page: 0, size: 9999 })).content as RepresentationDTO[],
        staleTime: 5 * 60 * 1000,
    });
    const { data: wordTypes = [] } = useQuery({
        queryKey: ["word-create-options", "word-types"],
        queryFn: async () => (await wordTypeApi.getPage({ page: 0, size: 9999 })).content as WordTypeDTO[],
        staleTime: 5 * 60 * 1000,
    });

    const viLangId = useMemo(() => findLangId(languages, ["vi", "vie"]), [languages]);
    const jaLangId = useMemo(() => findLangId(languages, ["ja", "jpn", "jp"]), [languages]);

    // ── Form state ──
    const [word, setWord] = useState("");
    const [reading, setReading] = useState("");
    const [wordType, setWordType] = useState("");
    const [frequency, setFrequency] = useState("");
    const [representationId, setRepresentationId] = useState<number | undefined>();
    const [levelId, setLevelId] = useState<number | undefined>();
    const [meanings, setMeanings] = useState<MeaningRow[]>([{ languageId: undefined, name: "" }]);
    const [examples, setExamples] = useState<ExampleRow[]>([]);

    const [submitting, setSubmitting] = useState(false);
    const [errors, setErrors] = useState<Record<string, string[]>>({});

    const err = (field: string) => errors[field]?.[0];

    // ── Meaning rows ──
    const addMeaning = () =>
        setMeanings((prev) => [...prev, { languageId: undefined, name: "" }]);
    const removeMeaning = (i: number) =>
        setMeanings((prev) => prev.filter((_, idx) => idx !== i));
    const updateMeaning = (i: number, patch: Partial<MeaningRow>) =>
        setMeanings((prev) => prev.map((m, idx) => (idx === i ? { ...m, ...patch } : m)));

    // ── Example rows ──
    const addExample = () =>
        setExamples((prev) => [...prev, {
            rootLanguageId: jaLangId, toLanguageId: viLangId, rootExample: "", toExample: "",
        }]);
    const removeExample = (i: number) =>
        setExamples((prev) => prev.filter((_, idx) => idx !== i));
    const updateExample = (i: number, patch: Partial<ExampleRow>) =>
        setExamples((prev) => prev.map((e, idx) => (idx === i ? { ...e, ...patch } : e)));

    // ── Client-side validation ──
    const validate = (): boolean => {
        const next: Record<string, string[]> = {};
        if (!word.trim()) next.word = ["Vui lòng nhập từ vựng"];
        if (!representationId) next.representationId = ["Vui lòng chọn loại biểu diễn"];
        if (!levelId) next.levelId = ["Vui lòng chọn cấp độ"];
        const validMeanings = meanings.filter((m) => m.name.trim() && m.languageId);
        if (validMeanings.length === 0) next.meanings = ["Cần ít nhất một nghĩa (chọn ngôn ngữ + nội dung)"];
        meanings.forEach((m, i) => {
            if (m.name.trim() && !m.languageId) next[`meaning-lang-${i}`] = ["Chọn ngôn ngữ"];
        });
        setErrors(next);
        return Object.keys(next).length === 0;
    };

    const handleSubmit = async () => {
        if (!validate()) {
            toast.error("Vui lòng kiểm tra lại thông tin");
            return;
        }
        const payload: WordCreateRequest = {
            word: word.trim(),
            reading: reading.trim() || undefined,
            wordType: wordType.trim() || undefined,
            frequency: frequency.trim() ? Number(frequency) : undefined,
            representationId,
            levelId,
            meanings: meanings
                .filter((m) => m.name.trim() && m.languageId)
                .map((m) => ({ languageId: m.languageId, name: m.name.trim() })),
            examples: examples
                .filter((e) => e.rootExample.trim() && e.rootLanguageId && e.toLanguageId)
                .map((e) => ({
                    rootLanguageId: e.rootLanguageId,
                    toLanguageId: e.toLanguageId,
                    rootExample: e.rootExample.trim(),
                    toExample: e.toExample.trim() || undefined,
                })),
        };

        try {
            setSubmitting(true);
            setErrors({});
            await wordApi.createFull(payload);
            qc.invalidateQueries({ queryKey: ["word"] });
            toast.success("Đã tạo từ vựng mới");
            navigate("/words");
        } catch (e: unknown) {
            if (axios.isAxiosError(e) && e.response?.status === 400) {
                const body = e.response.data as ValidationErrorResponse;
                if (body?.errors) setErrors(body.errors);
                toast.error(body?.message || "Dữ liệu không hợp lệ");
            } else {
                toast.error("Tạo từ vựng thất bại");
            }
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <MainLayout pathName={{ "/words": "Từ vựng", "/words/create": "Tạo từ vựng" }} pageScroll>
            <div className="w-full space-y-3 pb-8">

                {/* ── Actions (top) ── */}
                <div className="flex items-center justify-end gap-2">
                    <Button variant="outline" onClick={() => navigate("/words")} disabled={submitting}>
                        Huỷ
                    </Button>
                    <Button onClick={handleSubmit} disabled={submitting} className="gap-1.5">
                        {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                        Lưu từ vựng
                    </Button>
                </div>

                {/* ── Word info ── */}
                <InfoCard
                    icon={<BookText className="h-4 w-4 text-primary" />}
                    title="Thông tin từ"
                    info="Thông tin cốt lõi của từ: cách viết, cách đọc, dạng chữ và cấp độ JLPT."
                    className="h-auto py-4 gap-3"
                    headerClassName="px-5"
                    contentClassName="px-5 space-y-4"
                >
                    <div className="grid sm:grid-cols-2 gap-4">
                        <Field
                            label="Từ vựng"
                            required
                            error={err("word")}
                            info="Từ tiếng Nhật cần thêm — có thể là kanji, hiragana hoặc katakana (vd: 食べる)."
                        >
                            <Input value={word} onChange={(e) => setWord(e.target.value)}
                                placeholder="食べる" autoFocus />
                        </Field>
                        <Field
                            label="Cách đọc"
                            info="Cách đọc bằng kana (furigana) của từ (vd: たべる). Để trống nếu từ đã là kana."
                        >
                            <Input value={reading} onChange={(e) => setReading(e.target.value)}
                                placeholder="たべる" />
                        </Field>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-4">
                        <Field
                            label="Loại biểu diễn"
                            required
                            error={err("representationId")}
                            info="Dạng chữ viết chính của từ: Kanji, Hiragana hay Katakana."
                        >
                            <RelationSelect
                                value={representationId}
                                onChange={setRepresentationId}
                                options={representations.map((r) => ({ value: r.id!, label: r.name ?? r.code ?? String(r.id) }))}
                                placeholder="Chọn loại..."
                            />
                        </Field>
                        <Field
                            label="Cấp độ (JLPT)"
                            required
                            error={err("levelId")}
                            info="Trình độ JLPT của từ, từ N5 (dễ nhất) đến N1 (khó nhất)."
                        >
                            <RelationSelect
                                value={levelId}
                                onChange={setLevelId}
                                options={levels.map((l) => ({ value: l.id!, label: l.name ?? l.code ?? String(l.id) }))}
                                placeholder="Chọn cấp độ..."
                            />
                        </Field>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-4">
                        <Field
                            label="Loại từ"
                            info="Từ loại của từ vựng (danh từ, động từ, tính từ…). Chọn từ danh sách Word Type."
                        >
                            <Select value={wordType || undefined} onValueChange={setWordType}>
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Chọn loại từ..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {wordTypes.map((t) => (
                                        <SelectItem key={t.id} value={t.code ?? String(t.id)}>
                                            {t.name}{t.code ? ` (${t.code})` : ""}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </Field>
                        <Field
                            label="Tần suất (frequency)"
                            info="Mức độ phổ biến của từ — số càng nhỏ càng hay dùng. Dùng để ưu tiên xếp hạng khi tìm kiếm."
                        >
                            <Input type="number" value={frequency} onChange={(e) => setFrequency(e.target.value)}
                                placeholder="vd 1200" />
                        </Field>
                    </div>
                </InfoCard>

                {/* ── Meanings ── */}
                <InfoCard
                    icon={<Languages className="h-4 w-4 text-primary" />}
                    title="Nghĩa"
                    info="Một hoặc nhiều nghĩa của từ theo từng ngôn ngữ (vd: tiếng Việt, tiếng Anh). Cần ít nhất một nghĩa."
                    actions={
                        <Button variant="outline" size="sm" onClick={addMeaning} className="gap-1.5">
                            <Plus className="h-3.5 w-3.5" /> Thêm nghĩa
                        </Button>
                    }
                    className="h-auto py-4 gap-3"
                    headerClassName="px-5"
                    contentClassName="px-5 space-y-4"
                >
                        {err("meanings") && <p className="text-xs text-destructive">{err("meanings")}</p>}
                        {meanings.map((m, i) => (
                            <div key={i} className="flex gap-2 items-start">
                                <div className="w-40 shrink-0">
                                    <RelationSelect
                                        value={m.languageId}
                                        onChange={(v) => updateMeaning(i, { languageId: v })}
                                        options={languages.map((l) => ({ value: l.id!, label: l.name ?? l.code ?? String(l.id) }))}
                                        placeholder="Ngôn ngữ"
                                    />
                                    {err(`meaning-lang-${i}`) && (
                                        <p className="text-xs text-destructive mt-1">{err(`meaning-lang-${i}`)}</p>
                                    )}
                                </div>
                                <Input
                                    className="flex-1"
                                    value={m.name}
                                    onChange={(e) => updateMeaning(i, { name: e.target.value })}
                                    placeholder="Nghĩa của từ (vd: ăn / eat)"
                                />
                                <Button
                                    variant="ghost" size="icon"
                                    onClick={() => removeMeaning(i)}
                                    disabled={meanings.length === 1}
                                    title="Xoá nghĩa"
                                    className="text-muted-foreground hover:text-destructive shrink-0"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        ))}
                </InfoCard>

                {/* ── Examples ── */}
                <InfoCard
                    icon={<MessageSquareText className="h-4 w-4 text-primary" />}
                    title="Ví dụ"
                    info="Câu ví dụ minh hoạ cách dùng từ, kèm bản dịch. Không bắt buộc — có thể thêm nhiều câu."
                    actions={
                        <Button variant="outline" size="sm" onClick={addExample} className="gap-1.5">
                            <Plus className="h-3.5 w-3.5" /> Thêm ví dụ
                        </Button>
                    }
                    className="h-auto py-4 gap-3"
                    headerClassName="px-5"
                    contentClassName="px-5 space-y-4"
                >
                        {examples.length === 0 && (
                            <p className="text-xs text-muted-foreground">Chưa có ví dụ nào. Bấm “Thêm ví dụ” để thêm.</p>
                        )}
                        {examples.map((ex, i) => (
                            <div key={i} className="rounded-lg border p-3 space-y-3 bg-muted/20">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-semibold text-muted-foreground">Ví dụ {i + 1}</span>
                                    <Button
                                        variant="ghost" size="icon"
                                        onClick={() => removeExample(i)}
                                        title="Xoá ví dụ"
                                        className="text-muted-foreground hover:text-destructive h-7 w-7"
                                    >
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                </div>
                                <div className="grid sm:grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <InfoLabel
                                            className="text-xs font-medium"
                                            title="Ngôn ngữ câu gốc"
                                            info="Ngôn ngữ của câu ví dụ gốc — thường là tiếng Nhật."
                                            iconSize={12}
                                        />
                                        <RelationSelect
                                            value={ex.rootLanguageId}
                                            onChange={(v) => updateExample(i, { rootLanguageId: v })}
                                            options={languages.map((l) => ({ value: l.id!, label: l.name ?? l.code ?? String(l.id) }))}
                                            placeholder="Ngôn ngữ"
                                        />
                                        <Textarea
                                            value={ex.rootExample}
                                            onChange={(e) => updateExample(i, { rootExample: e.target.value })}
                                            placeholder="毎朝ご飯を食べる。"
                                            rows={2}
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <InfoLabel
                                            className="text-xs font-medium"
                                            title="Ngôn ngữ bản dịch"
                                            info="Ngôn ngữ của câu dịch — thường là tiếng Việt."
                                            iconSize={12}
                                        />
                                        <RelationSelect
                                            value={ex.toLanguageId}
                                            onChange={(v) => updateExample(i, { toLanguageId: v })}
                                            options={languages.map((l) => ({ value: l.id!, label: l.name ?? l.code ?? String(l.id) }))}
                                            placeholder="Ngôn ngữ"
                                        />
                                        <Textarea
                                            value={ex.toExample}
                                            onChange={(e) => updateExample(i, { toExample: e.target.value })}
                                            placeholder="Mỗi sáng tôi ăn cơm."
                                            rows={2}
                                        />
                                    </div>
                                </div>
                            </div>
                        ))}
                </InfoCard>
            </div>
        </MainLayout>
    );
}

// ── Small field wrapper ───────────────────────────────────────────────
function Field({ label, info, required, error, children }: {
    label: string; info?: string; required?: boolean; error?: string; children: React.ReactNode;
}) {
    return (
        <div className="space-y-1.5">
            <InfoLabel
                className="text-sm font-medium"
                iconSize={12}
                title={
                    <>
                        {label} {required && <span className="text-destructive">*</span>}
                    </>
                }
                info={info}
            />
            {children}
            {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
    );
}

// ── Relation select (number value) ────────────────────────────────────
function RelationSelect({ value, onChange, options, placeholder }: {
    value?: number;
    onChange: (v: number) => void;
    options: { value: number; label: string }[];
    placeholder?: string;
}) {
    return (
        <Select
            value={value != null ? String(value) : undefined}
            onValueChange={(v) => onChange(Number(v))}
        >
            <SelectTrigger className="w-full">
                <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            <SelectContent>
                {options.map((o) => (
                    <SelectItem key={o.value} value={String(o.value)}>{o.label}</SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
}