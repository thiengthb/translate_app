import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Loader2, GraduationCap, AlarmClock, Target } from "lucide-react";

import { MainLayout } from "@/components/layout/MainLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  grammarLearnApi,
  type LevelSummary,
  type GoalSnapshot,
} from "@/api/features/grammar/grammar-learn.api";

function GoalCard() {
  const [goal, setGoal] = useState<GoalSnapshot | null>(null);
  const [newPerDay, setNewPerDay] = useState(5);
  const [reviewsPerDay, setReviewsPerDay] = useState(50);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const g = await grammarLearnApi.getGoal();
        setGoal(g);
        setNewPerDay(g.newPerDay);
        setReviewsPerDay(g.reviewsPerDay);
      } catch {
        /* ignore */
      }
    })();
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      const g = await grammarLearnApi.updateGoal(newPerDay, reviewsPerDay);
      setGoal(g);
      toast.success("Đã lưu mục tiêu hằng ngày.");
    } catch {
      toast.error("Lưu mục tiêu thất bại.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="p-5 gap-4">
      <div className="flex items-center gap-2">
        <Target size={18} className="text-primary" />
        <span className="font-semibold">Mục tiêu mỗi ngày</span>
        {goal && (
          <span className="ml-auto text-sm text-muted-foreground">
            Hôm nay: {goal.newDoneToday}/{goal.newPerDay} mới · {goal.reviewsDoneToday}/{goal.reviewsPerDay} ôn
          </span>
        )}
      </div>
      <div className="flex flex-wrap items-end gap-4">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted-foreground">Ngữ pháp mới / ngày</span>
          <Input
            type="number"
            min={0}
            max={200}
            value={newPerDay}
            onChange={(e) => setNewPerDay(Math.max(0, Number(e.target.value)))}
            className="w-28"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted-foreground">Ôn tập / ngày</span>
          <Input
            type="number"
            min={0}
            max={1000}
            value={reviewsPerDay}
            onChange={(e) => setReviewsPerDay(Math.max(0, Number(e.target.value)))}
            className="w-28"
          />
        </label>
        <Button onClick={save} disabled={saving}>
          {saving && <Loader2 className="animate-spin" size={16} />} Lưu
        </Button>
      </div>
    </Card>
  );
}

function LevelCard({ s, onContinue, onDetail }: {
  s: LevelSummary;
  onContinue: () => void;
  onDetail: () => void;
}) {
  const pct = s.total > 0 ? Math.round((s.unlocked / s.total) * 100) : 0;
  const active = s.reviewDue > 0 || s.learning > 0;
  return (
    <Card className="p-5 gap-4">
      <div className="flex items-center gap-3">
        <span className="text-lg font-bold">{s.level}</span>
        <span className="text-sm text-muted-foreground">
          Unlocked {s.unlocked} / {s.total}
        </span>
        {s.reviewDue > 0 && (
          <Badge className="ml-auto gap-1 bg-amber-500 hover:bg-amber-500">
            <AlarmClock size={12} /> {s.reviewDue} cần ôn
          </Badge>
        )}
      </div>

      <Progress value={pct} className="h-2" />

      <div className="flex gap-4 text-sm text-muted-foreground">
        <span>📖 Learning: <b className="text-foreground">{s.learning}</b></span>
        <span>⏰ Review due: <b className="text-foreground">{s.reviewDue}</b></span>
        <span>✓ Mastered: <b className="text-foreground">{s.mastered}</b></span>
      </div>

      <div className="flex gap-2">
        <Button onClick={onContinue} variant={active ? "default" : "outline"}>
          {active ? "Tiếp tục học" : "Bắt đầu"}
        </Button>
        <Button onClick={onDetail} variant="ghost">Xem chi tiết</Button>
      </div>
    </Card>
  );
}

export default function GrammarDashboardPage() {
  const navigate = useNavigate();
  const [levels, setLevels] = useState<LevelSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        setLevels(await grammarLearnApi.dashboard());
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const totalDue = levels.reduce((a, l) => a + l.reviewDue, 0);

  return (
    <MainLayout pathName={{ "/grammar": "Ngữ pháp" }}>
      <div className="w-full max-w-2xl flex flex-col gap-5">
        <div className="flex items-center gap-3">
          <GraduationCap className="text-primary" />
          <h1 className="text-xl font-bold">Ngữ pháp</h1>
        </div>

        <Card className="p-5 flex-row items-center justify-between gap-4 bg-primary/5 border-primary/20">
          <div>
            <div className="font-semibold">Phiên học hôm nay</div>
            <p className="text-sm text-muted-foreground">
              {totalDue > 0 ? `${totalDue} mục cần ôn + bài mới` : "Học bài mới theo lộ trình"}
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <Button size="lg" onClick={() => navigate("/grammar/learn")}>
              Tiếp tục học
            </Button>
            <Button variant="outline" onClick={() => navigate("/grammar/learn?challenge=1")}>
              ⚡ Thử thách (dịch câu)
            </Button>
          </div>
        </Card>

        <GoalCard />

        {loading ? (
          <div className="flex justify-center h-40 items-center">
            <Loader2 className="animate-spin text-primary" size={32} />
          </div>
        ) : levels.length === 0 ? (
          <Card className="p-6 text-sm text-muted-foreground">
            Chưa có dữ liệu ngữ pháp. Hãy seed grammar (module production) trước.
          </Card>
        ) : (
          levels.map((s) => (
            <LevelCard
              key={s.level}
              s={s}
              onContinue={() => navigate(`/grammar/learn?level=${s.level}`)}
              onDetail={() => navigate(`/grammar/levels/${s.level}`)}
            />
          ))
        )}
      </div>
    </MainLayout>
  );
}
