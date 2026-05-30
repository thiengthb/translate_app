import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  productionApi,
  type AttemptResult,
  type ExerciseResponse,
} from "@/api/features/production.api";

const VERDICT_STYLE: Record<string, string> = {
  PASS: "bg-green-600 text-white",
  PARTIAL: "bg-amber-500 text-white",
  FAIL: "bg-red-600 text-white",
};

const VERDICT_LABEL: Record<string, string> = {
  PASS: "Đúng",
  PARTIAL: "Gần đúng",
  FAIL: "Chưa đạt",
};

export default function ProductionPage() {
  const [exercise, setExercise] = useState<ExerciseResponse | null>(null);
  const [answer, setAnswer] = useState("");
  const [result, setResult] = useState<AttemptResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const loadExercise = useCallback(async () => {
    setLoading(true);
    setResult(null);
    setAnswer("");
    try {
      setExercise(await productionApi.getExercise());
    } catch {
      toast.error("Không tải được bài tập. Kiểm tra backend đã chạy chưa.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadExercise();
  }, [loadExercise]);

  const onSubmit = async () => {
    if (!exercise || !answer.trim()) return;
    setSubmitting(true);
    try {
      setResult(await productionApi.submitAttempt(exercise.promptId, answer));
    } catch {
      toast.error("Chấm bài thất bại. Vui lòng thử lại.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <MainLayout pathName={{ "/production": "Luyện viết câu" }}>
      <div className="w-full flex flex-col gap-6">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="animate-spin text-primary" size={32} />
          </div>
        ) : exercise ? (
          <>
            <Card className="p-6 gap-3">
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{exercise.jlptLevel}</Badge>
                <span className="text-sm text-muted-foreground">{exercise.subUseName}</span>
              </div>
              <pre className="whitespace-pre-wrap font-inter text-sm leading-relaxed">
                {exercise.l1Prompt}
              </pre>
            </Card>

            <Card className="p-6 gap-4">
              <Textarea
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder="Viết câu trả lời bằng tiếng Nhật..."
                rows={3}
                maxLength={1000}
                disabled={submitting}
              />
              <div className="flex items-center gap-3">
                <Button onClick={onSubmit} disabled={submitting || !answer.trim()}>
                  {submitting && <Loader2 className="animate-spin" size={16} />}
                  Nộp bài
                </Button>
                <Button variant="outline" onClick={loadExercise} disabled={submitting}>
                  Câu tiếp
                </Button>
              </div>
            </Card>

            {result && (
              <Card className="p-6 gap-3">
                <div className="flex items-center gap-2">
                  <Badge className={VERDICT_STYLE[result.finalVerdict]}>
                    {VERDICT_LABEL[result.finalVerdict] ?? result.finalVerdict}
                  </Badge>
                  <Badge variant={result.detectorPassed ? "secondary" : "outline"}>
                    {result.detectorPassed ? "Đúng cấu trúc" : "Chưa thấy cấu trúc"}
                  </Badge>
                  {result.judgeScore != null && (
                    <span className="text-sm text-muted-foreground">
                      Nghĩa: {(result.judgeScore * 100).toFixed(0)}%
                    </span>
                  )}
                </div>
                {result.feedback && (
                  <p className="text-sm leading-relaxed">{result.feedback}</p>
                )}
              </Card>
            )}
          </>
        ) : (
          <Card className="p-6">
            <p className="text-sm text-muted-foreground">Không có bài tập nào.</p>
          </Card>
        )}
      </div>
    </MainLayout>
  );
}
