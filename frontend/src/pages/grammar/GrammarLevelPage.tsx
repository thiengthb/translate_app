import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Loader2, Lock } from "lucide-react";

import { MainLayout } from "@/components/layout/MainLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { grammarLearnApi, type GrammarItem, type LevelDetail } from "@/api/features/grammar/grammar-learn.api";

function Section({ title, items, locked, onClick }: {
  title: string;
  items: GrammarItem[];
  locked?: boolean;
  onClick: (id: number) => void;
}) {
  if (items.length === 0) return null;
  return (
    <Card className="p-5 gap-3">
      <div className="text-sm font-semibold">{title} ({items.length})</div>
      <div className="flex flex-wrap gap-2">
        {items.map((g) => (
          <button
            key={g.subUseId}
            onClick={() => onClick(g.subUseId)}
            className={
              "px-3 py-1.5 rounded-full text-sm border transition-colors inline-flex items-center gap-1 " +
              (locked
                ? "bg-muted/40 text-muted-foreground border-border"
                : "bg-background hover:bg-muted border-border")
            }
          >
            {locked && <Lock size={11} />}
            {g.name}
          </button>
        ))}
      </div>
    </Card>
  );
}

export default function GrammarLevelPage() {
  const { level = "N5" } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState<LevelDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        setData(await grammarLearnApi.level(level));
      } finally {
        setLoading(false);
      }
    })();
  }, [level]);

  const go = (id: number) => navigate(`/grammar/detail/${id}`);

  return (
    <MainLayout pathName={{ [`/grammar/levels/${level}`]: `Ngữ pháp ${level}` }}>
      <div className="w-full max-w-2xl flex flex-col gap-5">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold">{level}</h1>
          {data && (
            <span className="text-sm text-muted-foreground">
              {data.unlocked} / {data.total} đã mở khóa
            </span>
          )}
          <Button
            className="ml-auto"
            onClick={() => navigate(`/grammar/learn?level=${level}`)}
          >
            Học {level}
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center h-40 items-center">
            <Loader2 className="animate-spin text-primary" size={32} />
          </div>
        ) : data ? (
          <>
            <Section title="✓ Đã thành thạo" items={data.mastered} onClick={go} />
            <Section title="📖 Đang học" items={data.learning} onClick={go} />
            <Section title="🔒 Đã khóa" items={data.locked} locked onClick={go} />
          </>
        ) : null}
      </div>
    </MainLayout>
  );
}
