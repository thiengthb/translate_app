import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { assessmentApi } from "@/api";
import type { QuestionBankDTO } from "@/types";
import { MainLayout } from "@/components/layout/MainLayout";
import { Badge } from "@/components/ui/badge";
import { History, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { QuestionForm } from "./QuestionForm";

/**
 * Single-question editor page. Create-new is handled by the multi-draft
 * workspace (MultiQuestionCreatePage); this page covers editing one existing
 * question at /questions/:questionId/edit.
 */
export default function QuestionFormPage() {
  const navigate = useNavigate();
  const { questionId } = useParams<{ questionId?: string }>();

  const [question, setQuestion] = useState<QuestionBankDTO | null>(null);
  const [loading, setLoading] = useState(questionId != null);

  useEffect(() => {
    if (questionId == null) return;
    setLoading(true);
    assessmentApi.fetchQuestionById(Number(questionId))
      .then(setQuestion)
      .catch(() => {
        toast.error("Failed to load question.");
        navigate("/questions");
      })
      .finally(() => setLoading(false));
  }, [questionId, navigate]);

  const pathLabel = "Edit question";

  return (
    <MainLayout pathName={{ "/questions": "Question Bank", [`/questions/${questionId ?? ""}/edit`]: pathLabel }}>
      <div className="w-full max-w-4xl mx-auto space-y-5">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-semibold flex items-center gap-2">
            {pathLabel}
            {question?.contentVersion != null && (
              <Badge variant="outline" className="gap-1 text-[10px] font-normal">
                <History className="size-3" /> v{question.contentVersion}
              </Badge>
            )}
          </h1>
        </div>

        <p className="text-sm text-muted-foreground">
          Editing content bumps its version; in-progress attempts keep their snapshot.
        </p>

        {loading ? (
          <div className="flex items-center justify-center h-60">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <QuestionForm
            question={question}
            onSaved={() => navigate("/questions")}
            onCancel={() => navigate("/questions")}
          />
        )}
      </div>
    </MainLayout>
  );
}
