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
  DEFAULT_DRAFT,
  parseAlgorithmConfig,
  normalizeSetting,
  normalizeDraft,
  toAlgorithmConfigJson,
  retentionLabel,
} from "@/lib/srs-preview";
import {
  CalendarDays,
  ChevronDown,
  Eye,
  Gauge,
  GraduationCap,
  HelpCircle,
  Loader2,
  Repeat2,
  RotateCcw,
  Save,
  Shield,
  SlidersHorizontal,
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
      algorithmConfigJson: toAlgorithmConfigJson(nextDraft),
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
                        Anki SM2 scheduling &amp; daily limits · applies to this deck only
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
                      disabled={loading}
                      className="inline-flex h-10 shrink-0 items-center gap-2 rounded-lg border border-border px-3 text-sm font-semibold text-foreground transition-colors hover:bg-accent disabled:opacity-50"
                      title="See how the schedule & numbers work"
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
                      title="Retention"
                      icon={<Shield className="size-5" />}
                      help="Target retention adjusts the interval modifier."
                    >
                      <div className="space-y-3">
                        <div className="flex items-end justify-between gap-3">
                          <div>
                            <p className="text-sm font-medium text-foreground">Target retention</p>
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

