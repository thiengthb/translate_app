import type { Leniency } from "../lib/strokeMatch";
import type { QuizOrder, WritingSettings } from "../hooks/useWritingSettings";
import { CycleRow, Sheet, SheetGroup, ToggleRow, cycleNext } from "./KanjiSettingsSheet";

/**
 * The two option sheets of the writing mode, matching the mobile app:
 *  - {@link WritingContentDialog}  → "Đã hiển thị nội dung" (what to reveal)
 *  - {@link WritingSettingsDialog} → the gear settings (behaviour + Chỉnh nét)
 */

type BoolKey = { [K in keyof WritingSettings]: WritingSettings[K] extends boolean ? K : never }[keyof WritingSettings];

const ORDER_LABEL: Record<QuizOrder, string> = {
  ACCURACY: "Theo độ chính xác",
  RANDOM: "Ngẫu nhiên",
  SEQUENTIAL: "Theo thứ tự",
};
const ORDER_CYCLE: QuizOrder[] = ["ACCURACY", "RANDOM", "SEQUENTIAL"];

const LENIENCY_LABEL: Record<Leniency, string> = { LOW: "THẤP", MEDIUM: "VỪA", HIGH: "CAO" };
const LENIENCY_CYCLE: Leniency[] = ["LOW", "MEDIUM", "HIGH"];

/* ── content dialog (Picture 2) ──────────────────────────────────────────── */

export function WritingContentDialog({
  settings,
  toggle,
  onClose,
}: {
  settings: WritingSettings;
  toggle: (key: BoolKey) => void;
  onClose: () => void;
}) {
  return (
    <Sheet title="Đã hiển thị nội dung" onClose={onClose}>
      <SheetGroup>
        <ToggleRow label="Âm On" desc="Hiện âm On-yomi nếu có" checked={settings.showOnyomi} onToggle={() => toggle("showOnyomi")} />
        <ToggleRow label="Âm Kun" desc="Hiện âm Kun-yomi nếu có" checked={settings.showKunyomi} onToggle={() => toggle("showKunyomi")} />
        <ToggleRow
          label="Phát âm bổ sung"
          desc="Hiển thị cách phát âm theo các ngôn ngữ Châu á"
          checked={settings.showExtraReadings}
          onToggle={() => toggle("showExtraReadings")}
        />
        <ToggleRow label="Ý nghĩa" desc="Hiện nghĩa của ký tự" checked={settings.showMeaning} onToggle={() => toggle("showMeaning")} />
        <ToggleRow label="Ghi chú" desc="Hiện ghi chú nếu có" checked={settings.showNotes} onToggle={() => toggle("showNotes")} />
      </SheetGroup>
    </Sheet>
  );
}

/* ── settings dialog (Picture 3) ─────────────────────────────────────────── */

export function WritingSettingsDialog({
  settings,
  toggle,
  update,
  onClose,
}: {
  settings: WritingSettings;
  toggle: (key: BoolKey) => void;
  update: <K extends keyof WritingSettings>(key: K, value: WritingSettings[K]) => void;
  onClose: () => void;
}) {
  return (
    <Sheet title="Cài đặt luyện viết" onClose={onClose}>
      <SheetGroup>
        <ToggleRow
          label="Thêm câu hỏi khi trả lời sai"
          desc="Lặp lại câu hỏi khi trả lời sai"
          checked={settings.repeatOnWrong}
          onToggle={() => toggle("repeatOnWrong")}
        />
        <ToggleRow
          label="Tạm dừng sau khi trả lời"
          desc="Hiện thông tin và tiếp tục khi nhấn vào màn hình"
          checked={settings.pauseAfterAnswer}
          onToggle={() => toggle("pauseAfterAnswer")}
        />
        <CycleRow
          label="Quiz order"
          desc="Thứ tự Hán tự dùng trong bài"
          value={ORDER_LABEL[settings.order]}
          onCycle={() => update("order", cycleNext(ORDER_CYCLE, settings.order))}
        />
        <CycleRow
          label="Chỉnh nét"
          desc="Điều chỉnh mức độ can thiệp của việc chỉnh nét"
          value={LENIENCY_LABEL[settings.leniency]}
          onCycle={() => update("leniency", cycleNext(LENIENCY_CYCLE, settings.leniency))}
        />
        <ToggleRow
          label="Hiện gợi ý"
          desc="Hiển thị nét đúng nếu sai quá nhiều lần"
          checked={settings.showHint}
          onToggle={() => toggle("showHint")}
        />
        <ToggleRow
          label="Làm lại đến khi hoàn hảo"
          desc="Thử viết lại chữ đến khi không còn mắc lỗi"
          checked={settings.redoUntilPerfect}
          onToggle={() => toggle("redoUntilPerfect")}
        />
        <ToggleRow
          label="Play reading audio"
          desc="Tự phát âm đọc nếu trình duyệt hỗ trợ giọng nói"
          checked={settings.playReadingAudio}
          onToggle={() => toggle("playReadingAudio")}
        />
        <ToggleRow
          label="Xem đáp án"
          desc="Hiển thị gợi ý của chữ để luyện tập"
          checked={settings.showAnswer}
          onToggle={() => toggle("showAnswer")}
        />
        <ToggleRow
          label="Hypermode"
          desc="Chế độ thử thách: ẩn thông tin và nét mẫu"
          checked={settings.hypermode}
          onToggle={() => toggle("hypermode")}
        />
      </SheetGroup>
    </Sheet>
  );
}
