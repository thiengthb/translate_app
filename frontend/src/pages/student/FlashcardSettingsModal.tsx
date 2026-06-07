import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "motion/react";
import { srsAlgorithmConfigApi, ankiSrsSettingApi } from "@/api";
import type { SrsAlgorithmConfigDTO } from "@/types";
import { cn } from "@/lib/utils";
import { getCurrentUserId } from "@/utils/auth.utils";
import { ScrollHintContainer } from "@/components/common/ScrollHintContainer";
import {
  type SettingsDraft,
  type FsrsConfigView,
  DEFAULT_DRAFT,
  parseAlgorithmConfig,
  parseFsrsConfig,
  isFsrsAlgorithm,
  normalizeSetting,
  normalizeDraft,
  toAlgorithmConfigJson,
  retentionLabel,
} from "@/lib/srs-preview";
import {
  CalendarDays,
  ChevronDown,
  Cpu,
  Eye,
  FlaskConical,
  Gauge,
  GraduationCap,
  HelpCircle,
  Loader2,
  Repeat2,
  RotateCcw,
  Save,
  Shield,
  SlidersHorizontal,
  Wand2,
  X,
} from "lucide-react";
import { toast } from "sonner";

interface FlashcardSettingsModalProps {
  open: boolean;
  onClose: () => void;
  /** Settings are scoped to this deck. Editing only affects this deck. */
  deckId: number;
  /** Optional deck title shown in the header for context. */
  deckTitle?: string;
}

function visibleAlgorithms(list: SrsAlgorithmConfigDTO[], userId: number) {
  const userPrefix = `USER_SM2_${userId}`;
  return list.filter((item) => {
    const code = item.code ?? "";
    // Hide other users' personal presets; keep shared presets and this user's
    // own presets (global `USER_SM2_<id>` and per-deck `USER_SM2_<id>_<deckId>`).
    if (!code.startsWith("USER_SM2_")) return true;
    return code === userPrefix || code.startsWith(`${userPrefix}_`);
  });
}

export function FlashcardSettingsModal({ open, onClose, deckId, deckTitle }: FlashcardSettingsModalProps) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [algorithms, setAlgorithms] = useState<SrsAlgorithmConfigDTO[]>([]);
  const [draft, setDraft] = useState<SettingsDraft>(DEFAULT_DRAFT);

  const selectedAlgorithm = useMemo(
    () => algorithms.find((item) => item.id === draft.algorithmConfigId) ?? null,
    [algorithms, draft.algorithmConfigId],
  );

  // FSRS is a future enhancement: the deck-level modal can SELECT an FSRS preset
  // and tune its desired retention + daily limits, but the FSRS weights live in
  // the preset (read-only here) and scheduling itself is not implemented yet.
  const isFsrs = isFsrsAlgorithm(selectedAlgorithm);
  const fsrsView = useMemo<FsrsConfigView>(
    () => parseFsrsConfig(selectedAlgorithm?.configJson),
    [selectedAlgorithm],
  );

  const sanitizedDraft = useMemo(() => normalizeDraft(draft), [draft]);

  // Open the standalone preview page, carrying the (unsaved) current settings.
  const openPreview = () => {
    navigate(`/deck/${deckId}/srs-preview`, {
      state: { draft: sanitizedDraft, deckTitle, algorithm: selectedAlgorithm },
    });
  };

  useEffect(() => {
    if (!open) return;

    const load = async () => {
      const userId = getCurrentUserId();
      if (!userId) {
        toast.error("Cannot load settings for this account.");
        onClose();
        return;
      }

      setLoading(true);
      try {
        const [algorithmList, currentSetting] = await Promise.all([
          srsAlgorithmConfigApi.getEnabled(),
          ankiSrsSettingApi.getForDeck(deckId),
        ]);

        let filteredAlgorithms = visibleAlgorithms(algorithmList, userId);
        let currentAlgorithm: SrsAlgorithmConfigDTO | null =
          filteredAlgorithms.find((item) => item.id === currentSetting?.algorithmConfigId) ?? null;

        if (!currentAlgorithm && currentSetting?.algorithmConfigId) {
          try {
            currentAlgorithm = await srsAlgorithmConfigApi.getById(String(currentSetting.algorithmConfigId));
            filteredAlgorithms = visibleAlgorithms([...filteredAlgorithms, currentAlgorithm], userId);
          } catch {
            currentAlgorithm = null;
          }
        }

        setAlgorithms(filteredAlgorithms);
        setDraft(normalizeSetting(currentSetting, currentAlgorithm));
      } catch {
        toast.error("Failed to load study settings.");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [open, onClose, deckId]);

  const patchDraft = (patch: Partial<SettingsDraft>) => {
    setDraft((prev) => ({ ...prev, ...patch }));
  };

  const handleAlgorithmChange = (algorithmConfigId: number) => {
    const algorithm = algorithms.find((item) => item.id === algorithmConfigId) ?? null;
    setDraft((prev) => ({
      ...prev,
      ...parseAlgorithmConfig(algorithm?.configJson),
      algorithmConfigId,
    }));
  };

  const resetDefaults = () => {
    setDraft((prev) => ({
      ...prev,
      ...DEFAULT_DRAFT,
      algorithmConfigId: 0,
    }));
  };

  const handleSave = async () => {
    const userId = getCurrentUserId();
    if (!userId) {
      toast.error("Cannot save settings for this account.");
      return;
    }

    const nextDraft = normalizeDraft(draft);
    const payload = {
      algorithmConfigId: nextDraft.algorithmConfigId || undefined,
      // For FSRS we link the chosen preset as-is (its weights/version live in the
      // preset). Sending an SM-2 config JSON would force the deck back onto an
      // SM-2 preset, so we only write the JSON when editing an SM-2 algorithm.
      algorithmConfigJson: isFsrs ? undefined : toAlgorithmConfigJson(nextDraft),
      // Target retention doubles as FSRS "desired retention".
      targetRetention: Number(nextDraft.targetRetention.toFixed(2)),
      maxReviewsPerDay: nextDraft.maxReviewsPerDay,
      maxItemsPerDay: nextDraft.maxItemsPerDay,
      buryRelatedItems: nextDraft.buryRelatedItems,
    };

    setSaving(true);
    try {
      const saved = await ankiSrsSettingApi.saveForDeck(deckId, payload);
      let refreshedAlgorithms = algorithms;
      try {
        refreshedAlgorithms = visibleAlgorithms(await srsAlgorithmConfigApi.getEnabled(), userId);
      } catch {
        refreshedAlgorithms = algorithms;
      }
      const savedAlgorithm = refreshedAlgorithms.find((item) => item.id === saved.algorithmConfigId) ?? null;

      setAlgorithms(refreshedAlgorithms);
      setDraft(normalizeSetting(saved, savedAlgorithm));
      toast.success("Study settings saved.");
      onClose();
    } catch {
      toast.error("Failed to save study settings.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-40 bg-black/55 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.16 }}
            onClick={saving ? undefined : onClose}
          />

          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="pointer-events-auto flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-border bg-background shadow-2xl"
              initial={{ opacity: 0, scale: 0.96, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 16 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
            >
              <div className="shrink-0 border-b border-border bg-card/95 px-4 py-3 backdrop-blur sm:px-5">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <SlidersHorizontal className="size-5" />
                    </div>
                    <div className="min-w-0">
                      <h2 className="text-lg font-bold tracking-tight text-foreground">
                        {deckTitle ? `${deckTitle} — study settings` : "Deck study settings"}
                      </h2>
                      <p className="truncate text-xs text-muted-foreground">
                        {isFsrs
                          ? "FSRS scheduling (Beta) · desired retention & daily limits · applies to this deck only"
                          : "Anki SM2 scheduling & daily limits · applies to this deck only"}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-1 items-center gap-2 lg:justify-end">
                    <div className="relative flex-1 lg:max-w-md">
                      <select
                        value={String(draft.algorithmConfigId)}
                        onChange={(event) => handleAlgorithmChange(Number(event.target.value))}
                        disabled={loading || saving}
                        className="h-10 w-full appearance-none rounded-lg border border-input bg-background px-3 pr-9 text-sm text-foreground outline-none transition-shadow focus:ring-1 focus:ring-ring disabled:opacity-50"
                      >
                        <option value="0">Built-in Anki SM2</option>
                        {algorithms.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.name ?? item.code ?? "Algorithm preset"}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    </div>

                    <button
                      onClick={resetDefaults}
                      disabled={loading || saving}
                      className="inline-flex h-10 shrink-0 items-center gap-2 rounded-lg border border-border px-3 text-sm font-semibold text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-50"
                      title="Restore default settings"
                    >
                      <RotateCcw className="size-4" />
                      <span className="hidden sm:inline">Reset</span>
                    </button>

                    <button
                      onClick={openPreview}
                      disabled={loading || isFsrs}
                      className="inline-flex h-10 shrink-0 items-center gap-2 rounded-lg border border-border px-3 text-sm font-semibold text-foreground transition-colors hover:bg-accent disabled:opacity-50"
                      title={isFsrs ? "Preview chỉ áp dụng cho SM-2" : "See how the schedule & numbers work"}
                    >
                      <Eye className="size-4" />
                      <span className="hidden sm:inline">Preview</span>
                    </button>

                    <button
                      onClick={handleSave}
                      disabled={loading || saving}
                      className="inline-flex h-10 shrink-0 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 disabled:opacity-50"
                    >
                      {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                      Save
                    </button>

                    <button
                      onClick={onClose}
                      disabled={saving}
                      className="h-10 shrink-0 rounded-lg border border-border px-3 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-50"
                      title="Close"
                    >
                      <X className="size-4" />
                    </button>
                  </div>
                </div>
              </div>

              <ScrollHintContainer className="flex-1 bg-muted/25" viewportClassName="p-4 sm:p-5">
                {loading ? (
                  <div className="flex h-80 items-center justify-center">
                    <Loader2 className="size-6 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <div className="space-y-4">
                    {isFsrs && <FsrsBetaBanner version={fsrsView.fsrsVersion} />}
                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                    <SettingsPanel
                      title="Daily Limits"
                      icon={<CalendarDays className="size-5" />}
                      help="Limits returned by the Anki study queue."
                    >
                      <NumberField
                        label="New cards/day"
                        value={draft.maxItemsPerDay}
                        min={0}
                        max={9999}
                        onChange={(value) => patchDraft({ maxItemsPerDay: value })}
                      />
                      <NumberField
                        label="Maximum reviews/day"
                        value={draft.maxReviewsPerDay}
                        min={0}
                        max={99999}
                        onChange={(value) => patchDraft({ maxReviewsPerDay: value })}
                      />
                      {/* Hidden for now — "Bury related cards" isn't used yet.
                      <ToggleRow
                        label="Bury related cards"
                        checked={draft.buryRelatedItems}
                        onChange={(checked) => patchDraft({ buryRelatedItems: checked })}
                      />
                      */}
                    </SettingsPanel>

                    <SettingsPanel
                      title={isFsrs ? "Desired Retention" : "Retention"}
                      icon={<Shield className="size-5" />}
                      help={
                        isFsrs
                          ? "Giá trị này càng cao, card xuất hiện thường xuyên hơn để tăng khả năng nhớ, nhưng số review mỗi ngày cũng tăng."
                          : "Target retention adjusts the interval modifier."
                      }
                    >
                      <div className="space-y-3">
                        <div className="flex items-end justify-between gap-3">
                          <div>
                            <p className="text-sm font-medium text-foreground">
                              {isFsrs ? "Desired retention" : "Target retention"}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {retentionLabel(draft.targetRetention)}
                            </p>
                          </div>
                          <span className="text-2xl font-bold tabular-nums text-foreground">
                            {Math.round(draft.targetRetention * 100)}%
                          </span>
                        </div>
                        <input
                          type="range"
                          min={70}
                          max={98}
                          value={Math.round(draft.targetRetention * 100)}
                          onChange={(event) =>
                            patchDraft({ targetRetention: Number(event.target.value) / 100 })
                          }
                          className="w-full accent-primary"
                        />
                        <div className="grid grid-cols-3 text-[10px] font-medium uppercase text-muted-foreground">
                          <span>Fast</span>
                          <span className="text-center">Balanced</span>
                          <span className="text-right">Conservative</span>
                        </div>
                      </div>
                    </SettingsPanel>

                    {isFsrs && <FsrsPanels view={fsrsView} />}

                    {!isFsrs && (
                    <>
                    <SettingsPanel
                      title="Learning"
                      icon={<GraduationCap className="size-5" />}
                      help="Controls new and relearning card steps."
                    >
                      <TextField
                        label="Learning steps"
                        value={draft.learningSteps}
                        placeholder="1m 10m"
                        onChange={(value) => patchDraft({ learningSteps: value })}
                      />
                      <TextField
                        label="Relearning steps"
                        value={draft.relearningSteps}
                        placeholder="10m"
                        onChange={(value) => patchDraft({ relearningSteps: value })}
                      />
                      <NumberField
                        label="Graduating interval"
                        value={draft.graduatingIntervalDays}
                        min={1}
                        max={36500}
                        suffix="d"
                        onChange={(value) => patchDraft({ graduatingIntervalDays: value })}
                      />
                      <NumberField
                        label="Easy interval"
                        value={draft.easyIntervalDays}
                        min={1}
                        max={36500}
                        suffix="d"
                        onChange={(value) => patchDraft({ easyIntervalDays: value })}
                      />
                    </SettingsPanel>

                    <SettingsPanel
                      title="Review Cards"
                      icon={<Repeat2 className="size-5" />}
                      help="Controls interval growth after a card graduates."
                    >
                      <NumberField
                        label="Starting ease"
                        value={draft.startingEase}
                        min={1.3}
                        max={5}
                        step={0.01}
                        onChange={(value) => patchDraft({ startingEase: value })}
                      />
                      <NumberField
                        label="Minimum ease"
                        value={draft.minEase}
                        min={1.3}
                        max={5}
                        step={0.01}
                        onChange={(value) => patchDraft({ minEase: value })}
                      />
                      <NumberField
                        label="Hard interval"
                        value={draft.hardInterval}
                        min={1}
                        max={5}
                        step={0.01}
                        suffix="x"
                        onChange={(value) => patchDraft({ hardInterval: value })}
                      />
                      <NumberField
                        label="Easy bonus"
                        value={draft.easyBonus}
                        min={1}
                        max={5}
                        step={0.01}
                        suffix="x"
                        onChange={(value) => patchDraft({ easyBonus: value })}
                      />
                    </SettingsPanel>

                    <SettingsPanel
                      title="Advanced"
                      icon={<Gauge className="size-5" />}
                      help="Bounds and modifiers applied to review intervals."
                    >
                      <NumberField
                        label="Maximum interval"
                        value={draft.maxIntervalDays}
                        min={1}
                        max={36500}
                        suffix="d"
                        onChange={(value) => patchDraft({ maxIntervalDays: value })}
                      />
                      <NumberField
                        label="Interval modifier"
                        value={draft.intervalModifier}
                        min={0.1}
                        max={5}
                        step={0.01}
                        suffix="x"
                        onChange={(value) => patchDraft({ intervalModifier: value })}
                      />
                      <NumberField
                        label="New interval"
                        value={draft.newInterval}
                        min={0}
                        max={1}
                        step={0.01}
                        onChange={(value) => patchDraft({ newInterval: value })}
                      />
                    </SettingsPanel>
                    </>
                    )}
                    </div>
                  </div>
                )}
              </ScrollHintContainer>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function SettingsPanel({
  title,
  icon,
  help,
  children,
}: {
  title: string;
  icon: ReactNode;
  help: string;
  children: ReactNode;
}) {
  return (
    <motion.section
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18 }}
      className="rounded-2xl border border-border bg-card p-5 shadow-sm"
    >
      <div className="mb-4 flex items-center justify-between border-b border-border pb-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            {icon}
          </div>
          <h3 className="truncate text-xl font-bold tracking-tight text-foreground">{title}</h3>
        </div>
        <span title={help}>
          <HelpCircle className="size-5 text-muted-foreground" />
        </span>
      </div>
      <div className="space-y-3">{children}</div>
    </motion.section>
  );
}

function NumberField({
  label,
  value,
  min,
  max,
  step = 1,
  suffix,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  suffix?: string;
  onChange: (value: number) => void;
}) {
  return (
    <label className="grid grid-cols-[minmax(0,1fr)_minmax(112px,160px)] items-center gap-3">
      <span className="text-sm font-medium text-foreground">{label}</span>
      <span className="relative">
        <input
          type="number"
          min={min}
          max={max}
          step={step}
          value={Number.isFinite(value) ? value : ""}
          onChange={(event) => onChange(Number(event.target.value))}
          className={cn(
            "h-9 w-full rounded-lg border border-input bg-background px-3 text-sm font-medium text-foreground outline-none transition-shadow focus:ring-1 focus:ring-ring",
            suffix && "pr-8",
          )}
        />
        {suffix && (
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground">
            {suffix}
          </span>
        )}
      </span>
    </label>
  );
}

function TextField({
  label,
  value,
  placeholder,
  onChange,
}: {
  label: string;
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="grid grid-cols-[minmax(0,1fr)_minmax(112px,160px)] items-center gap-3">
      <span className="text-sm font-medium text-foreground">{label}</span>
      <input
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm font-medium text-foreground outline-none transition-shadow focus:ring-1 focus:ring-ring"
      />
    </label>
  );
}

/* ──────────────────────────────────────────
   FSRS (Free Spaced Repetition Scheduler).

   The scheduler is implemented (FSRS-5, the canonical 19-parameter model): an
   FSRS deck schedules with real Difficulty/Stability/Retrievability. Desired
   retention is editable per-deck; FSRS weights are read-only (managed by the
   future optimizer); optimize / simulator / reschedule are surfaced as
   "coming soon".
────────────────────────────────────────── */

function FsrsBetaBanner({ version }: { version: string }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-emerald-400/40 bg-emerald-400/10 p-4">
      <FlaskConical className="mt-0.5 size-5 shrink-0 text-emerald-500" />
      <div className="min-w-0 space-y-1">
        <p className="text-sm font-bold text-emerald-700 dark:text-emerald-400">
          FSRS đang hoạt động (Beta){version && version !== "—" ? ` · ${version}` : ""}
        </p>
        <p className="text-xs leading-relaxed text-emerald-700/90 dark:text-emerald-300/90">
          Bộ thẻ này lập lịch bằng thuật toán <b>FSRS-5</b> thật (mô hình
          Difficulty / Stability / Retrievability), điều khiển bởi <b>Desired Retention</b> bên dưới —
          không dùng ease factor như SM-2. Các công cụ <b>optimize / mô phỏng / reschedule</b> sẽ được
          bổ sung sau; tham số hiện dùng bộ mặc định.
        </p>
      </div>
    </div>
  );
}

function FsrsPanels({ view }: { view: FsrsConfigView }) {
  const paramText =
    view.parameters.length > 0
      ? view.parameters.map((value) => Number(value.toFixed(4))).join(", ")
      : "Chưa có — sẽ dùng tham số mặc định của FSRS.";

  return (
    <>
      <SettingsPanel
        title="FSRS Parameters"
        icon={<Cpu className="size-5" />}
        help="Bộ tham số của mô hình FSRS. Người dùng phổ thông không nên chỉnh tay; hệ thống có thể optimize từ lịch sử review khi đủ dữ liệu."
      >
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-foreground">Weights</span>
            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              {view.parameters.length} tham số · read-only
            </span>
          </div>
          <textarea
            readOnly
            value={paramText}
            rows={4}
            className="w-full resize-none rounded-lg border border-input bg-muted/40 px-3 py-2 font-mono text-[11px] leading-relaxed text-muted-foreground outline-none"
          />
          <ReadOnlyRow label="Maximum interval" value={`${view.maximumIntervalDays}d`} />
        </div>
      </SettingsPanel>

      <SettingsPanel
        title="Công cụ FSRS"
        icon={<Wand2 className="size-5" />}
        help="Optimize, mô phỏng và tính lại lịch — sẽ được bổ sung khi FSRS hoàn thiện."
      >
        <div className="space-y-2">
          <ComingSoonRow
            icon={<Wand2 className="size-4" />}
            label="Optimize current preset"
            desc="Phân tích lịch sử review để tìm bộ tham số phù hợp hơn."
          />
          <ComingSoonRow
            icon={<FlaskConical className="size-4" />}
            label="FSRS Simulator"
            desc="Mô phỏng workload theo desired retention & new cards/day."
          />
          <ComingSoonRow
            icon={<Repeat2 className="size-4" />}
            label="Reschedule cards on change"
            desc={`Tính lại due date khi đổi tham số (hiện ${view.rescheduleCardsOnChange ? "BẬT" : "tắt"} trong preset).`}
          />
        </div>
      </SettingsPanel>
    </>
  );
}

function ReadOnlyRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-border bg-background px-3 py-2">
      <span className="text-sm font-medium text-foreground">{label}</span>
      <span className="text-sm font-semibold tabular-nums text-muted-foreground">{value}</span>
    </div>
  );
}

function ComingSoonRow({ icon, label, desc }: { icon: ReactNode; label: string; desc: string }) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-dashed border-border bg-muted/30 px-3 py-2.5 opacity-80">
      <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md bg-background text-muted-foreground">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-foreground">{label}</span>
          <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-primary">
            Sắp có
          </span>
        </div>
        <p className="text-xs text-muted-foreground">{desc}</p>
      </div>
    </div>
  );
}

