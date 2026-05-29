import { useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { analyzeApi, type AnalysisResult, type AnalyzedToken } from "@/api/features/analyze.api";

const SAMPLE_SENTENCE = "今日は良い天気ですね。";

function TokenCard({ token }: { token: AnalyzedToken }) {
  const isSymbol = token.partOfSpeech === "記号";
  const showBaseForm = token.baseForm && token.baseForm !== token.surface;

  return (
    <Card className="px-4 py-3 gap-2 items-center min-w-[88px]">
      <div className="text-2xl leading-tight text-center">
        {token.furigana ? (
          <ruby>
            {token.surface}
            <rt className="text-xs text-muted-foreground">{token.furigana}</rt>
          </ruby>
        ) : (
          <span>{token.surface}</span>
        )}
      </div>

      {!isSymbol && (
        <Badge variant="secondary" className="text-[11px]">
          {token.partOfSpeechVi}
        </Badge>
      )}

      {showBaseForm && (
        <span className="text-xs text-muted-foreground">→ {token.baseForm}</span>
      )}
    </Card>
  );
}

export default function AnalyzePage() {
  const [text, setText] = useState("");
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);

  const onAnalyze = async () => {
    if (!text.trim()) return;
    setLoading(true);
    try {
      setResult(await analyzeApi.analyze(text));
    } catch {
      toast.error("Phân tích thất bại. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <MainLayout pathName={{ "/analyze": "Phân tích câu" }}>
      <div className="w-full max-w-5xl mx-auto flex flex-col gap-6">
        <Card className="p-6 gap-4">
          <div>
            <h1 className="text-xl font-semibold">Phân tích câu tiếng Nhật</h1>
            <p className="text-sm text-muted-foreground">
              Nhập một câu tiếng Nhật để tách từ, xem cách đọc (furigana), loại từ và thể từ điển.
            </p>
          </div>

          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Ví dụ: 今日は良い天気ですね。"
            rows={3}
            maxLength={1000}
          />

          <div className="flex items-center gap-3">
            <Button onClick={onAnalyze} disabled={loading || !text.trim()}>
              {loading && <Loader2 className="animate-spin" size={16} />}
              Phân tích
            </Button>
            <Button variant="outline" onClick={() => setText(SAMPLE_SENTENCE)} disabled={loading}>
              Dùng câu mẫu
            </Button>
          </div>
        </Card>

        {result && (
          <Card className="p-6 gap-4">
            <div className="text-sm text-muted-foreground">
              {result.tokenCount} từ
            </div>
            {result.tokens.length > 0 ? (
              <div className="flex flex-wrap gap-3">
                {result.tokens.map((token, i) => (
                  <TokenCard key={`${token.surface}-${i}`} token={token} />
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Không có từ nào để hiển thị.</p>
            )}
          </Card>
        )}
      </div>
    </MainLayout>
  );
}
