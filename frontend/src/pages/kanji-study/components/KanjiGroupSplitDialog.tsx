import { useState } from "react";

/**
 * "Chia thành bộ mới?" — mirrors the mobile Kanji Study app's split dialog:
 * pick a group size, optionally repeat the split, preview the resulting
 * group count, then OK/HỦY.
 */
export function KanjiGroupSplitDialog({
  title,
  count,
  wholeDeck,
  onConfirm,
  onClose,
}: {
  /** Group label ("Nhóm 1") or deck title when splitting the whole deck. */
  title: string;
  /** Number of kanji being split. */
  count: number;
  /** Whole-deck split ignores current group boundaries (repeat is implied). */
  wholeDeck?: boolean;
  onConfirm: (size: number, repeat: boolean) => void;
  onClose: () => void;
}) {
  const [sizeText, setSizeText] = useState("10");
  const [repeat, setRepeat] = useState(true);

  const size = Math.max(1, parseInt(sizeText, 10) || 0);
  const valid = Number.isFinite(size) && size >= 1;
  const resultGroups = !valid
    ? 0
    : wholeDeck || repeat
      ? Math.ceil(count / size)
      : size >= count
        ? 1
        : 2;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-2xl bg-white dark:bg-gray-800 shadow-xl p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Chia thành bộ mới?
        </h3>
        <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
          {title} · {count} kanji
        </p>

        <label className="mt-4 flex items-center justify-between gap-4">
          <span className="text-sm text-gray-700 dark:text-gray-300">Số ký tự</span>
          <input
            type="number"
            min={1}
            value={sizeText}
            onChange={(e) => setSizeText(e.target.value)}
            className="w-20 rounded-lg border border-gray-300 dark:border-gray-600 bg-transparent px-2 py-1 text-right font-semibold text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-violet-400"
          />
        </label>

        {!wholeDeck && (
          <label className="mt-3 flex items-center justify-between gap-4 cursor-pointer select-none">
            <span className="text-sm text-gray-700 dark:text-gray-300">Lặp lại việc tách</span>
            <input
              type="checkbox"
              checked={repeat}
              onChange={(e) => setRepeat(e.target.checked)}
              className="h-4 w-4 accent-teal-500"
            />
          </label>
        )}

        <p className="mt-4 text-center text-sm text-gray-500 dark:text-gray-400">
          Kết quả sau khi chia bộ:
          <br />
          <span className="font-semibold italic text-gray-800 dark:text-gray-200">
            {valid ? `${resultGroups} nhóm` : "—"}
          </span>
        </p>

        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            HỦY
          </button>
          <button
            disabled={!valid}
            onClick={() => valid && onConfirm(size, wholeDeck ? true : repeat)}
            className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-violet-600 hover:bg-violet-700 disabled:opacity-50"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
}
