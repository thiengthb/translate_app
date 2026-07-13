import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { assessmentApi } from "@/api";
import type { QuestionTagDTO } from "@/types";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirmdialog";
import { DataPagination } from "@/components/common/DataPagination";
import { AlertCircle, Loader2, Plus, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { QuestionDraftEditor } from "./QuestionDraftEditor";
import {
  buildQuestionPayload,
  createEmptyDraft,
  draftHasContent,
  isDraftValid,
  validateQuestionDraft,
  type QuestionDraft,
} from "./questionDraft";

// Drafts live in sessionStorage so a reload / navigating away and back doesn't
// lose an in-progress batch.
const DRAFTS_KEY = "questionBank:newDrafts";
// The sidebar pages its list so a long batch stays scannable.
const SIDEBAR_PAGE_SIZE = 10;

export default function MultiQuestionCreatePage() {
  const navigate = useNavigate();

  const [allTags, setAllTags] = useState<QuestionTagDTO[]>([]);
  const [drafts, setDrafts] = useState<QuestionDraft[]>(() => {
    try {
      const raw = sessionStorage.getItem(DRAFTS_KEY);
      const parsed = raw ? (JSON.parse(raw) as QuestionDraft[]) : null;
      if (parsed && parsed.length) return parsed;
    } catch {
      /* ignore malformed storage */
    }
    return [createEmptyDraft()];
  });
  const [activeId, setActiveId] = useState<string>(() => drafts[0].id);
  // Errors are only surfaced once the author has attempted a Create.
  const [triedCreate, setTriedCreate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  useEffect(() => {
    assessmentApi.fetchQuestionTags().then(setAllTags).catch(() => setAllTags([]));
  }, []);

  // Tell the author their earlier batch was restored (only if it had real work).
  useEffect(() => {
    if (drafts.some(draftHasContent)) {
      toast.info(`Restored ${drafts.length} draft question${drafts.length === 1 ? "" : "s"} from earlier.`);
    }
    // Once, on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist as the batch changes (drop the key when there's nothing worth keeping).
  useEffect(() => {
    try {
      if (drafts.some(draftHasContent)) sessionStorage.setItem(DRAFTS_KEY, JSON.stringify(drafts));
      else sessionStorage.removeItem(DRAFTS_KEY);
    } catch {
      /* ignore storage quota errors */
    }
  }, [drafts]);

  const dirty = drafts.some(draftHasContent);

  // Warn before a refresh / tab-close. SPA nav can't be blocked cleanly under
  // <BrowserRouter>; the sessionStorage copy covers that by restoring on return.
  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  // Keep the active id pointing at a draft that still exists.
  useEffect(() => {
    if (!drafts.some((d) => d.id === activeId)) setActiveId(drafts[0]?.id ?? "");
  }, [drafts, activeId]);

  const activeDraft = drafts.find((d) => d.id === activeId) ?? drafts[0];

  // ── Sidebar paging ──
  const [sidebarPage, setSidebarPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(drafts.length / SIDEBAR_PAGE_SIZE));
  const safePage = Math.min(sidebarPage, totalPages);
  const pageStart = (safePage - 1) * SIDEBAR_PAGE_SIZE;
  const pageDrafts = drafts.slice(pageStart, pageStart + SIDEBAR_PAGE_SIZE);

  // Follow the active draft so it's always on the visible page (after adding a
  // question or when Create jumps focus to the first invalid one).
  useEffect(() => {
    const idx = drafts.findIndex((d) => d.id === activeId);
    if (idx >= 0) setSidebarPage(Math.floor(idx / SIDEBAR_PAGE_SIZE) + 1);
  }, [activeId, drafts]);

  // Per-draft errors, recomputed live so fixing a field clears its marker.
  const errorsById = useMemo(() => {
    const map: Record<string, ReturnType<typeof validateQuestionDraft>> = {};
    if (triedCreate) for (const d of drafts) map[d.id] = validateQuestionDraft(d);
    return map;
  }, [drafts, triedCreate]);

  const updateActive = (patch: Partial<QuestionDraft>) =>
    setDrafts((prev) => prev.map((d) => (d.id === activeId ? { ...d, ...patch } : d)));

  const addDraft = () => {
    const nd = createEmptyDraft();
    setDrafts((prev) => [...prev, nd]);
    setActiveId(nd.id);
  };

  const deleteDraft = (id: string) =>
    setDrafts((prev) => {
      const next = prev.filter((d) => d.id !== id);
      return next.length ? next : [createEmptyDraft()];
    });

  const requestDeleteDraft = (id: string) => {
    const target = drafts.find((d) => d.id === id);
    if (target && draftHasContent(target)) setPendingDeleteId(id);
    else deleteDraft(id);
  };

  const requestCancel = () => {
    if (dirty) setCancelOpen(true);
    else navigate("/questions");
  };

  const create = async () => {
    setTriedCreate(true);
    const invalid = drafts.filter((d) => !isDraftValid(d));
    if (invalid.length) {
      setActiveId(invalid[0].id);
      toast.error(
        `${invalid.length} question${invalid.length === 1 ? "" : "s"} still ${invalid.length === 1 ? "has" : "have"} errors — fix them before creating.`,
      );
      return;
    }
    setSaving(true);
    let created = 0;
    try {
      // Validated up front, so failures here are network/server errors. Create
      // sequentially so a mid-batch failure leaves the rest as recoverable drafts.
      for (const d of drafts) {
        await assessmentApi.createQuestion(buildQuestionPayload(d));
        created += 1;
      }
      sessionStorage.removeItem(DRAFTS_KEY);
      toast.success(`Created ${drafts.length} question${drafts.length === 1 ? "" : "s"}.`);
      navigate("/questions");
    } catch {
      if (created > 0) {
        const rest = drafts.slice(created);
        setDrafts(rest);
        setActiveId(rest[0].id);
        toast.error(`Created ${created}, but the rest failed. The remaining drafts were kept.`);
      } else {
        toast.error("Failed to create questions. Nothing was saved.");
      }
    } finally {
      setSaving(false);
    }
  };

  const activeErrors = triedCreate ? errorsById[activeDraft.id] ?? [] : [];

  return (
    <MainLayout pathName={{ "/questions": "Question Bank", "/questions/new": "New question" }}>
      <div className="w-full max-w-6xl mx-auto space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-semibold">New questions</h1>
            <p className="text-sm text-muted-foreground">
              Draft several questions, then create them all at once. Nothing is saved until you click Create.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
          {/* ── Sidebar: every draft in the batch ── */}
          <aside className="w-full shrink-0 lg:sticky lg:top-4 lg:w-64">
            <div className="flex max-h-[calc(100vh-7rem)] flex-col rounded-xl border bg-card">
              <div className="flex items-center justify-between gap-2 border-b px-3 py-2.5">
                <h2 className="text-sm font-semibold">
                  Questions
                  <span className="ml-1.5 rounded-full bg-muted px-1.5 text-[11px] font-semibold text-muted-foreground tabular-nums">
                    {drafts.length}
                  </span>
                </h2>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto p-2">
                <ul className="space-y-1">
                  {pageDrafts.map((d, j) => {
                    const i = pageStart + j;
                    const active = d.id === activeDraft.id;
                    const hasError = (errorsById[d.id]?.length ?? 0) > 0;
                    return (
                      <li key={d.id}>
                        <div
                          className={cn(
                            "group flex items-center gap-2 rounded-lg border px-2.5 py-2 transition-colors cursor-pointer",
                            active
                              ? "border-primary/50 bg-primary/10"
                              : "border-transparent hover:bg-accent/50",
                          )}
                          onClick={() => setActiveId(d.id)}
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setActiveId(d.id); } }}
                          aria-current={active}
                        >
                          <span
                            className={cn(
                              "shrink-0 flex size-6 items-center justify-center rounded-full text-[11px] font-semibold tabular-nums",
                              active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
                            )}
                          >
                            {i + 1}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className={cn("truncate text-xs font-medium", active ? "text-foreground" : "text-foreground/80")}>
                              Question {i + 1}
                            </p>
                            <p className="truncate text-[11px] text-muted-foreground">
                              {d.prompt.trim() || <span className="italic">Empty</span>}
                            </p>
                          </div>
                          {hasError && (
                            <AlertCircle className="size-4 shrink-0 text-destructive" aria-label="Has validation errors" />
                          )}
                          <button
                            type="button"
                            title="Remove question"
                            aria-label={`Remove question ${i + 1}`}
                            onClick={(e) => { e.stopPropagation(); requestDeleteDraft(d.id); }}
                            className="shrink-0 flex size-6 items-center justify-center rounded-md text-muted-foreground opacity-0 transition-opacity hover:bg-destructive/10 hover:text-destructive focus:opacity-100 group-hover:opacity-100"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>

              {totalPages > 1 && (
                <div className="flex justify-center border-t px-2 py-2">
                  <DataPagination currentPage={safePage} totalPages={totalPages} onPageChange={setSidebarPage} />
                </div>
              )}

              <div className="border-t p-2">
                <Button variant="outline" size="sm" className="w-full" onClick={addDraft}>
                  <Plus className="size-4 mr-1" />Add question
                </Button>
              </div>
            </div>
          </aside>

          {/* ── Editor for the active draft ── */}
          <div className="min-w-0 flex-1 space-y-4">
            {triedCreate && activeErrors.length > 0 && (
              <div className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                <AlertCircle className="mt-0.5 size-4 shrink-0" />
                <span>Please fix the highlighted field{activeErrors.length === 1 ? "" : "s"} in this question.</span>
              </div>
            )}

            <QuestionDraftEditor
              key={activeDraft.id}
              draft={activeDraft}
              onChange={updateActive}
              allTags={allTags}
              errors={activeErrors}
            />

            <div className="flex items-center justify-end gap-2 border-t border-border/60 pt-4">
              <Button variant="ghost" onClick={requestCancel}>Cancel</Button>
              <Button onClick={create} disabled={saving}>
                {saving ? <Loader2 className="size-4 animate-spin mr-1" /> : <Save className="size-4 mr-1" />}
                Create{drafts.length > 1 ? ` (${drafts.length})` : ""}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={pendingDeleteId != null}
        tone="warning"
        title="Remove this question?"
        description="This draft hasn't been created yet and will be discarded."
        confirmLabel="Remove"
        cancelLabel="Keep"
        onConfirm={() => { if (pendingDeleteId) deleteDraft(pendingDeleteId); setPendingDeleteId(null); }}
        onCancel={() => setPendingDeleteId(null)}
      />

      <ConfirmDialog
        open={cancelOpen}
        tone="warning"
        title="Discard all drafts?"
        description="You have unsaved draft questions. Leaving now will discard them."
        confirmLabel="Discard"
        cancelLabel="Keep editing"
        onConfirm={() => { sessionStorage.removeItem(DRAFTS_KEY); navigate("/questions"); }}
        onCancel={() => setCancelOpen(false)}
      />
    </MainLayout>
  );
}
