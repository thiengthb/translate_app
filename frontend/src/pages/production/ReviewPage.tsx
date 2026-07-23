import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Check, Copy, Loader2, RotateCw, Sparkles, Upload, Wand2, X } from "lucide-react";

import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  productionApi,
  type GrammarOption,
  type ImportPromptItem,
  type PendingPrompt,
} from "@/api/features/production.api";

function formatDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleString("vi-VN");
}

const IMPORT_PLACEHOLDER = `[
  {
    "detectorKey": "prod_n5_tai",
    "situation": "Bạn kể với bạn cùng lớp về ước mơ đi Nhật năm sau.",
    "l2Reference": "来年、日本へ行きたいです。",
    "register": "polite"
  }
]`;

/** Build the copy-paste prompt for an external chat AI, embedding the valid keys. */
function buildAiPrompt(grammars: GrammarOption[]): string {
  const list = grammars
    .filter((g) => g.detectorKey)
    .map((g) => `- ${g.detectorKey} — ${g.name}${g.jlptLevel ? ` [${g.jlptLevel}]` : ""}`)
    .join("\n");
  return `Bạn là giáo viên tiếng Nhật, soạn câu luyện DỊCH Việt→Nhật cho người Việt học JLPT.

Nhiệm vụ: với mỗi mẫu ngữ pháp tôi chỉ định, tạo 15 câu luyện KHÁC NHAU. Mỗi câu gồm:
- "situation": MỘT tình huống đời thường bằng TIẾNG VIỆT (1 câu, xưng "Bạn ..."), trả lời được bằng đúng ngữ pháp đó. KHÔNG chào hỏi, xin lỗi, giới thiệu bản thân.
- "l2Reference": MỘT câu tiếng Nhật ngắn, tự nhiên (1 mệnh đề, tối đa 2), BẮT BUỘC dùng đúng mẫu ngữ pháp. Văn phong lịch sự (です/ます).

Quy tắc:
- Mọi câu "l2Reference" PHẢI chứa đúng mẫu ngữ pháp tương ứng.
- Đa dạng chủ đề và từ vựng giữa các câu.
- "detectorKey" lấy ĐÚNG từ danh sách dưới đây, KHÔNG tự bịa.

Mẫu ngữ pháp hợp lệ (detectorKey — tên [cấp]):
${list || "(chưa tải được danh sách — hãy mở lại modal sau khi đăng nhập)"}

Hãy nói cho tôi biết bạn muốn tạo cho (các) detectorKey nào, hoặc tôi sẽ tạo cho toàn bộ.
CHỈ trả về MỘT mảng JSON thuần (không markdown, không giải thích):
[{"detectorKey":"...","situation":"...","l2Reference":"...","register":"polite"}]`;
}

/** Parse pasted text into import items. Accepts a raw array or an { items: [...] } wrapper. */
function parseImportItems(raw: string): ImportPromptItem[] {
  const data = JSON.parse(raw);
  const arr: unknown = Array.isArray(data)
    ? data
    : Array.isArray((data as { items?: unknown })?.items)
      ? (data as { items: unknown[] }).items
      : null;
  if (!arr || !Array.isArray(arr)) {
    throw new Error('JSON phải là một mảng, hoặc object có trường "items".');
  }
  if (arr.length === 0) {
    throw new Error("Không có phần tử nào để import.");
  }
  return arr.map((x, i) => {
    const o = x as Record<string, unknown>;
    if (!o || typeof o !== "object") {
      throw new Error(`Phần tử #${i + 1} không hợp lệ.`);
    }
    const detectorKey = String(o.detectorKey ?? "").trim();
    const situation = String(o.situation ?? "").trim();
    const l2Reference = String(o.l2Reference ?? "").trim();
    if (!detectorKey || !situation || !l2Reference) {
      throw new Error(`Phần tử #${i + 1} thiếu detectorKey, situation hoặc l2Reference.`);
    }
    return {
      detectorKey,
      situation,
      l2Reference,
      register: o.register ? String(o.register).trim() : undefined,
      l1PromptTemplate: o.l1PromptTemplate ? String(o.l1PromptTemplate).trim() : undefined,
    };
  });
}

export default function ReviewPage() {
  const [items, setItems] = useState<PendingPrompt[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);

  // ── Import dialog ──
  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState("");
  const [importing, setImporting] = useState(false);
  const [grammars, setGrammars] = useState<GrammarOption[]>([]);
  const [showPrompt, setShowPrompt] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await productionApi.listPending());
    } catch {
      toast.error("Không tải được danh sách câu chờ duyệt.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // Load grammar points once, to show valid detectorKeys in the import dialog.
  useEffect(() => {
    productionApi
      .listGrammars()
      .then(setGrammars)
      .catch(() => {
        /* non-critical: the keys reference just won't render */
      });
  }, []);

  const act = useCallback(
    async (promptId: number, action: "approve" | "reject") => {
      setBusyId(promptId);
      try {
        if (action === "approve") {
          await productionApi.approvePrompt(promptId);
          toast.success("Đã duyệt — câu đã vào kho dùng chung.");
        } else {
          await productionApi.rejectPrompt(promptId);
          toast.success("Đã loại câu này.");
        }
        setItems((prev) => prev.filter((it) => it.promptId !== promptId));
      } catch {
        toast.error(action === "approve" ? "Duyệt thất bại." : "Loại thất bại.");
      } finally {
        setBusyId(null);
      }
    },
    [],
  );

  const handleImport = useCallback(async () => {
    let parsed: ImportPromptItem[];
    try {
      parsed = parseImportItems(importText);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "JSON không hợp lệ.");
      return;
    }
    setImporting(true);
    try {
      const result = await productionApi.importPrompts(parsed);
      toast.success(`Đã import ${result.imported} câu (bỏ qua ${result.skipped}).`);
      if (result.unknownKeys.length > 0) {
        toast.warning(`Mã ngữ pháp không tồn tại: ${result.unknownKeys.join(", ")}`);
      }
      setImportText("");
      setImportOpen(false);
      void load();
    } catch {
      toast.error("Import thất bại.");
    } finally {
      setImporting(false);
    }
  }, [importText, load]);

  const copyPrompt = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(buildAiPrompt(grammars));
      toast.success("Đã copy prompt — dán vào ChatGPT/Claude.");
    } catch {
      toast.error("Không copy được prompt.");
    }
  }, [grammars]);

  return (
    <MainLayout pageScroll>
      <div className="mx-auto w-full max-w-3xl p-4 sm:p-6 space-y-4">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h1 className="text-xl font-semibold flex items-center gap-2">
              <Sparkles size={20} className="text-primary" /> Duyệt câu AI
            </h1>
            <p className="text-sm text-muted-foreground">
              Câu do AI sinh ra chỉ vào kho dùng chung sau khi được duyệt.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="default" size="sm" onClick={() => setImportOpen(true)}>
              <Upload size={16} />
              Import JSON
            </Button>
            <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
              {loading ? <Loader2 className="animate-spin" size={16} /> : <RotateCw size={16} />}
              Tải lại
            </Button>
          </div>
        </div>

        {loading ? (
          <Card className="p-6 flex items-center justify-center gap-3 h-40">
            <Loader2 className="animate-spin text-primary" size={24} />
            <span className="text-sm text-muted-foreground">Đang tải…</span>
          </Card>
        ) : items.length === 0 ? (
          <Card className="p-10 text-center text-muted-foreground">
            Không có câu nào đang chờ duyệt. 🎉
          </Card>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">{items.length} câu đang chờ duyệt</p>
            {items.map((it) => {
              const busy = busyId === it.promptId;
              return (
                <Card key={it.promptId} className="p-6 gap-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    {it.jlptLevel && <Badge variant="secondary">{it.jlptLevel}</Badge>}
                    <span className="text-sm text-muted-foreground">{it.subUseName}</span>
                    {it.register && (
                      <Badge variant="outline" className="font-normal">
                        {it.register}
                      </Badge>
                    )}
                    {it.createdAt && (
                      <span className="text-xs text-muted-foreground ml-auto">
                        {formatDate(it.createdAt)}
                      </span>
                    )}
                  </div>

                  <div>
                    <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1">
                      Tình huống
                    </div>
                    <pre className="whitespace-pre-wrap font-inter text-sm leading-relaxed">
                      {it.situation}
                    </pre>
                  </div>

                  <div>
                    <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1">
                      Đáp án mẫu (tiếng Nhật)
                    </div>
                    <p className="text-base font-medium leading-relaxed">{it.referenceAnswer}</p>
                  </div>

                  <div className="flex items-center gap-3 pt-1">
                    <Button onClick={() => void act(it.promptId, "approve")} disabled={busy}>
                      {busy ? <Loader2 className="animate-spin" size={16} /> : <Check size={16} />}
                      Duyệt
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => void act(it.promptId, "reject")}
                      disabled={busy}
                    >
                      <X size={16} />
                      Loại
                    </Button>
                  </div>
                </Card>
              );
            })}
          </>
        )}
      </div>

      {/* Import dialog — paste a JSON batch produced by an external chat AI. */}
      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Import câu mẫu (JSON)</DialogTitle>
            <DialogDescription>
              Dán mảng JSON do AI (ChatGPT/Claude) sinh ra. Mỗi câu cần{" "}
              <code>detectorKey</code>, <code>situation</code>, <code>l2Reference</code> (tùy chọn{" "}
              <code>register</code>, <code>l1PromptTemplate</code>). Câu import vào hàng chờ duyệt.
            </DialogDescription>
          </DialogHeader>

          {/* Get-prompt helper: reveal the copy-paste prompt for an external AI. */}
          <div className="flex flex-col gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="self-start"
              onClick={() => setShowPrompt((v) => !v)}
            >
              <Wand2 size={16} />
              {showPrompt ? "Ẩn prompt" : "Lấy prompt cho AI"}
            </Button>
            {showPrompt && (
              <div className="rounded-md border bg-muted/30 p-2">
                <div className="mb-1 flex items-center justify-between gap-2">
                  <span className="text-xs text-muted-foreground">
                    Copy prompt này → dán vào ChatGPT/Claude → dán JSON nó trả về vào ô dưới.
                  </span>
                  <Button type="button" variant="ghost" size="sm" onClick={() => void copyPrompt()}>
                    <Copy size={14} />
                    Copy
                  </Button>
                </div>
                <pre className="max-h-48 overflow-auto whitespace-pre-wrap text-xs leading-relaxed">
                  {buildAiPrompt(grammars)}
                </pre>
              </div>
            )}
          </div>

          <Textarea
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
            placeholder={IMPORT_PLACEHOLDER}
            className="min-h-[220px] font-mono text-xs"
            spellCheck={false}
          />

          {grammars.length > 0 && (
            <details className="rounded-md border bg-muted/30 p-2 text-xs">
              <summary className="cursor-pointer select-none font-medium text-muted-foreground">
                Mã ngữ pháp hợp lệ ({grammars.length})
              </summary>
              <div className="mt-2 grid max-h-40 grid-cols-1 gap-1 overflow-y-auto sm:grid-cols-2">
                {grammars
                  .filter((g) => g.detectorKey)
                  .map((g) => (
                    <div key={g.id} className="flex items-center gap-2">
                      <code className="rounded bg-background px-1 py-0.5">{g.detectorKey}</code>
                      <span className="truncate text-muted-foreground">
                        {g.jlptLevel ? `${g.jlptLevel} · ` : ""}
                        {g.name}
                      </span>
                    </div>
                  ))}
              </div>
            </details>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setImportOpen(false)} disabled={importing}>
              Hủy
            </Button>
            <Button onClick={() => void handleImport()} disabled={importing || !importText.trim()}>
              {importing ? <Loader2 className="animate-spin" size={16} /> : <Upload size={16} />}
              Import
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
