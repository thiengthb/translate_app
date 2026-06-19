import type { QuizOrder } from "../hooks/useWritingSettings";
import type { QuizSettings } from "../hooks/useQuizSettings";
import { JLPT_CYCLE, JLPT_LABEL } from "../hooks/useQuizSettings";
import { CycleRow, RadioRow, SectionLabel, Sheet, SheetGroup, ToggleRow, cycleNext } from "./KanjiSettingsSheet";

/**
 * The two option sheets of the quiz mode, matching the mobile app:
 *  - {@link QuizContentDialog}  → "Cài đặt trắc nghiệm" (per-type content shown
 *    on a question, or the example picker for the "Ví dụ → Kanji" type)
 *  - {@link QuizSettingsDialog} → "Cài đặt chung" (general behaviour, shared in
 *    spirit with Luyện viết but stored independently)
 */

/** The four question directions of Trắc nghiệm. */
export type QuizType = "info-kanji" | "kanji-meaning" | "kanji-reading" | "example-kanji";

type BoolKey = { [K in keyof QuizSettings]: QuizSettings[K] extends boolean ? K : never }[keyof QuizSettings];

/** The content toggles that double as on-screen clues. */
export type QuizContentKey = "showOnyomi" | "showKunyomi" | "showExtraReadings" | "showMeaning" | "showNotes";

const ORDER_LABEL: Record<QuizOrder, string> = {
  ACCURACY: "Theo độ chính xác",
  RANDOM: "Ngẫu nhiên",
  SEQUENTIAL: "Theo thứ tự",
};
const ORDER_CYCLE: QuizOrder[] = ["ACCURACY", "RANDOM", "SEQUENTIAL"];

const CONTENT_ROWS: Record<QuizContentKey, { label: string; desc: string }> = {
  showOnyomi: { label: "Âm On", desc: "Hiện âm On-yomi nếu có" },
  showKunyomi: { label: "Âm Kun", desc: "Hiện âm Kun-yomi nếu có" },
  showExtraReadings: { label: "Phát âm bổ sung", desc: "Hiển thị cách phát âm theo các ngôn ngữ Châu á" },
  showMeaning: { label: "Ý nghĩa", desc: "Hiện nghĩa của ký tự" },
  showNotes: { label: "Ghi chú", desc: "Hiện ghi chú nếu có" },
};

/**
 * Which content toggles each quiz type exposes — a clue must never reveal its
 * own answer (Kanji → Nghĩa hides the meaning; Kanji → Cách đọc hides the
 * readings). The example type uses {@link ExamplePicker} instead.
 */
export const QUIZ_CONTENT_KEYS: Record<QuizType, QuizContentKey[]> = {
  "info-kanji": ["showOnyomi", "showKunyomi", "showExtraReadings", "showMeaning", "showNotes"],
  "kanji-meaning": ["showOnyomi", "showKunyomi", "showExtraReadings", "showNotes"],
  "kanji-reading": ["showMeaning", "showNotes"],
  "example-kanji": [],
};

/* ── content / example dialog ("Cài đặt trắc nghiệm") ─────────────────────── */

export function QuizContentDialog({
  type,
  settings,
  toggle,
  update,
  onClose,
}: {
  type: QuizType;
  settings: QuizSettings;
  toggle: (key: BoolKey) => void;
  update: <K extends keyof QuizSettings>(key: K, value: QuizSettings[K]) => void;
  onClose: () => void;
}) {
  return (
    <Sheet title="Cài đặt trắc nghiệm" onClose={onClose}>
      {type === "example-kanji" ? (
        <ExamplePicker settings={settings} toggle={toggle} update={update} />
      ) : (
        <SheetGroup>
          {QUIZ_CONTENT_KEYS[type].map((key) => (
            <ToggleRow
              key={key}
              label={CONTENT_ROWS[key].label}
              desc={CONTENT_ROWS[key].desc}
              checked={settings[key]}
              onToggle={() => toggle(key)}
            />
          ))}
        </SheetGroup>
      )}
    </Sheet>
  );
}

function ExamplePicker({
  settings,
  toggle,
  update,
}: {
  settings: QuizSettings;
  toggle: (key: BoolKey) => void;
  update: <K extends keyof QuizSettings>(key: K, value: QuizSettings[K]) => void;
}) {
  return (
    <>
      <SheetGroup>
        <RadioRow
          label="Từ vựng ngẫu nhiên"
          selected={settings.exampleSource === "WORD"}
          onSelect={() => update("exampleSource", "WORD")}
        />
        <RadioRow
          label="Câu ngẫu nhiên"
          selected={settings.exampleSource === "SENTENCE"}
          onSelect={() => update("exampleSource", "SENTENCE")}
        />
      </SheetGroup>
      <p className="px-5 py-3 text-sm text-muted-foreground">
        Phần dịch được ẩn với thiết lập mặc định. Chạm vào màn hình hoặc tạm dừng sau khi trả lời để hiện phần dịch nghĩa.
      </p>

      <SectionLabel>Giới hạn ví dụ</SectionLabel>
      <SheetGroup>
        <CycleRow
          label="Từ vựng JLPT"
          value={JLPT_LABEL[settings.exampleJlpt]}
          onCycle={() => update("exampleJlpt", cycleNext(JLPT_CYCLE, settings.exampleJlpt))}
        />
        <ToggleRow
          label="Phổ biến"
          desc="Chỉ chọn ví dụ từ những từ thông dụng"
          checked={settings.exampleCommonOnly}
          onToggle={() => toggle("exampleCommonOnly")}
        />
      </SheetGroup>

      <SectionLabel>Gợi ý hiển thị</SectionLabel>
      <SheetGroup>
        <ToggleRow
          label="Ý nghĩa"
          desc="Hiện nghĩa của ví dụ"
          checked={settings.exampleShowMeaning}
          onToggle={() => toggle("exampleShowMeaning")}
        />
        <ToggleRow
          label="Furigana"
          desc="Hiện cách đọc phía trên ví dụ"
          checked={settings.exampleShowFurigana}
          onToggle={() => toggle("exampleShowFurigana")}
        />
      </SheetGroup>
      <p className="px-5 py-3 text-sm text-muted-foreground">
        Lưu ý: Nếu không có ví dụ phù hợp với thiết lập trên, một ví dụ bất kì sẽ được chọn. Câu hỏi sẽ chuyển sang
        “Thông tin → Kanji” nếu Hán tự không có ví dụ nào.
      </p>
    </>
  );
}

/* ── general settings dialog ("Cài đặt chung") ────────────────────────────── */

export function QuizSettingsDialog({
  settings,
  toggle,
  update,
  onClose,
}: {
  settings: QuizSettings;
  toggle: (key: BoolKey) => void;
  update: <K extends keyof QuizSettings>(key: K, value: QuizSettings[K]) => void;
  onClose: () => void;
}) {
  return (
    <Sheet title="Cài đặt chung" onClose={onClose}>
      <SheetGroup>
        <ToggleRow
          label="Thêm câu hỏi khi trả lời sai"
          desc="Hỏi lại Hán tự ở cuối bài khi trả lời sai"
          checked={settings.repeatOnWrong}
          onToggle={() => toggle("repeatOnWrong")}
        />
        <ToggleRow
          label="Tạm dừng sau khi trả lời"
          desc="Hiện đáp án và tiếp tục khi nhấn vào màn hình"
          checked={settings.pauseAfterAnswer}
          onToggle={() => toggle("pauseAfterAnswer")}
        />
        <CycleRow
          label="Thứ tự học"
          desc="Thứ tự Hán tự dùng trong bài"
          value={ORDER_LABEL[settings.order]}
          onCycle={() => update("order", cycleNext(ORDER_CYCLE, settings.order))}
        />
        <ToggleRow
          label="Phát âm đọc"
          desc="Tự phát âm đọc nếu trình duyệt hỗ trợ giọng nói"
          checked={settings.playReadingAudio}
          onToggle={() => toggle("playReadingAudio")}
        />
      </SheetGroup>
    </Sheet>
  );
}
