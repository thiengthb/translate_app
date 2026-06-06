import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Loader2 } from "lucide-react";

import { MainLayout } from "@/components/layout/MainLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { grammarLearnApi, type GrammarDetail } from "@/api/features/grammar/grammar-learn.api";

const STATE_LABEL: Record<string, string> = {
  NEW: "Chưa học",
  LEARNING: "Đang học",
  RELEARNING: "Học lại",
  REVIEW: "Ôn tập",
};

function fmt(dt: string | null): string {
  if (!dt) return "—";
  return new Date(dt).toLocaleString("vi-VN", { dateStyle: "medium", timeStyle: "short" });
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between text-sm py-1.5 border-b border-border last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

export default function GrammarDetailPage() {
  const { subUseId } = useParams();
  const navigate = useNavigate();
  const [d, setD] = useState<GrammarDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        setD(await grammarLearnApi.detail(Number(subUseId)));
      } finally {
        setLoading(false);
      }
    })();
  }, [subUseId]);

  return (
    <MainLayout pathName={{ [`/grammar/detail/${subUseId}`]: "Chi tiết ngữ pháp" }}>
      <div className="w-full max-w-xl flex flex-col gap-5">
        {loading ? (
          <div className="flex justify-center h-40 items-center">
            <Loader2 className="animate-spin text-primary" size={32} />
          </div>
        ) : d ? (
          <>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold">{d.name}</h1>
              {d.jlptLevel && <Badge variant="secondary">{d.jlptLevel}</Badge>}
              <Badge className="ml-auto">{STATE_LABEL[d.state] ?? d.state}</Badge>
            </div>

            <Card className="p-5">
              <Row label="Trạng thái" value={STATE_LABEL[d.state] ?? d.state} />
              <Row label="Lần học cuối" value={fmt(d.lastReviewedAt)} />
              <Row label="Lần ôn tới" value={fmt(d.nextReviewAt)} />
              <Row label="Độ nhớ" value={d.memoryScore != null ? `${Math.round(d.memoryScore)}%` : "—"} />
              <Row label="Số lần ôn" value={d.reviewCount ?? "—"} />
              <Row label="Quên (lapses)" value={d.lapses ?? "—"} />
            </Card>

            {(d.nuanceDescription || d.structurePattern || d.exampleJp) && (
              <Card className="p-5 gap-3">
                {d.structurePattern && (
                  <div>
                    <div className="text-xs uppercase text-muted-foreground mb-1">Cấu trúc</div>
                    <p className="text-sm">{d.structurePattern}</p>
                  </div>
                )}
                {d.nuanceDescription && (
                  <div>
                    <div className="text-xs uppercase text-muted-foreground mb-1">Ý nghĩa</div>
                    <p className="text-sm">{d.nuanceDescription}</p>
                  </div>
                )}
                {d.exampleJp && (
                  <div>
                    <div className="text-xs uppercase text-muted-foreground mb-1">Ví dụ</div>
                    <p className="text-base">{d.exampleJp}</p>
                    {d.exampleVi && <p className="text-sm text-muted-foreground">{d.exampleVi}</p>}
                  </div>
                )}
              </Card>
            )}

            <Button onClick={() => navigate(d.jlptLevel ? `/grammar/learn?level=${d.jlptLevel}` : "/grammar/learn")}>
              Bắt đầu ôn
            </Button>
          </>
        ) : (
          <Card className="p-6 text-sm text-muted-foreground">Không tìm thấy.</Card>
        )}
      </div>
    </MainLayout>
  );
}
