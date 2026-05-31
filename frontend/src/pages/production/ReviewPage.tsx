import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Check, Loader2, RotateCw, Sparkles, X } from "lucide-react";

import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { productionApi, type PendingPrompt } from "@/api/features/production.api";

function formatDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleString("vi-VN");
}

export default function ReviewPage() {
  const [items, setItems] = useState<PendingPrompt[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);

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

  return (
    <MainLayout>
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
          <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
            {loading ? <Loader2 className="animate-spin" size={16} /> : <RotateCw size={16} />}
            Tải lại
          </Button>
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
    </MainLayout>
  );
}
