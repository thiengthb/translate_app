import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { deckApi, deckItemApi, flashcardApi, flashcardTemplateApi } from "@/api";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  Image as ImageIcon,
  Loader2,
  Mic,
  Save,
  Sparkles,
  Square,
  Trash2,
  Type,
  Video,
} from "lucide-react";
import { toast } from "sonner";
import type {
  CreateUpdateTemplateRequest,
  DeckDTO,
  FlashcardContentType,
  FlashcardDTO,
  FlashcardSideContentDTO,
  FlashcardSideType,
  FlashcardTemplateDTO,
} from "@/types";

interface Props {
  deckId: number;
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}

const PREVIEW_DEBOUNCE_MS = 180;
const DEFAULT_TEMPLATE_NAME = "Deck template";

type EditorTab = "front" | "back" | "css";

type DraftForm = {
  name: string;
  description: string;
  frontTemplate: string;
  backTemplate: string;
  styling: string;
};

const EMPTY_DRAFT: DraftForm = {
  name: DEFAULT_TEMPLATE_NAME,
  description: "",
  frontTemplate: "",
  backTemplate: "",
  styling: "",
};

const DEFAULT_STYLING = `/* Card-wide styling — edit to customize */
.card {
  font-family: ui-sans-serif, system-ui, sans-serif;
  font-size: 20px;
  text-align: center;
  color: #1f2937;
  background: #ffffff;
  padding: 24px 16px;
}
.card-main {
  font-size: 28px;
  font-weight: 700;
  margin-bottom: 8px;
}
.card-sub {
  font-size: 16px;
  color: #6b7280;
  margin: 4px 0;
}
.card img {
  max-width: 100%;
  max-height: 240px;
  height: auto;
  border-radius: 12px;
  margin: 8px auto;
  display: block;
}
.card audio, .card video {
  max-width: 100%;
  margin: 8px auto;
  display: block;
}
hr#answer {
  border: none;
  border-top: 2px solid #e5e7eb;
  margin: 24px 0;
}`;

/* ─────────────────────────────────────────
   Build the list of available labels (explicit + synthetic Field1/Field2)
───────────────────────────────────────── */
interface AvailableLabel {
  name: string;
  side: FlashcardSideType;
  contentType: FlashcardContentType;
  preview: string;
}

interface SideLabelSummary {
  labels: AvailableLabel[];
  unlabeledCount: number;
}

function buildAvailableLabels(
  flashcard: FlashcardDTO | null,
  side: FlashcardSideType
): SideLabelSummary {
  const labels: AvailableLabel[] = [];
  let unlabeledCount = 0;
  const sideDto = flashcard?.sides?.find((s) => s.side === side);
  if (!sideDto?.contents) return { labels, unlabeledCount };

  for (const c of sideDto.contents) {
    if (!c.contentValue) continue;
    const previewText =
      c.contentValue.length > 30
        ? c.contentValue.slice(0, 30) + "…"
        : c.contentValue;

    if (c.label && c.label.trim()) {
      labels.push({
        name: c.label.trim(),
        side,
        contentType: c.contentType,
        preview: previewText,
      });
    } else {
      unlabeledCount += 1;
    }
  }
  return { labels, unlabeledCount };
}

/* ─────────────────────────────────────────
   Render content value as HTML based on contentType
───────────────────────────────────────── */
function escapeHtmlAttr(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function renderContentValue(content: FlashcardSideContentDTO): string {
  if (!content.contentValue) return "";
  const url = escapeHtmlAttr(content.contentValue);
  switch (content.contentType) {
    case "IMAGE":
      return `<img src="${url}" alt="" />`;
    case "AUDIO":
      return `<audio controls src="${url}"></audio>`;
    case "VIDEO":
      return `<video controls src="${url}"></video>`;
    case "TEXT":
    case "CLOZE":
    default:
      return content.contentValue;
  }
}

/* ─────────────────────────────────────────
   buildLabelMap — supports both explicit labels AND synthetic FieldN
───────────────────────────────────────── */
function buildLabelMap(
  flashcard: FlashcardDTO | null,
  side: FlashcardSideType
): Record<string, string> {
  const map: Record<string, string> = {};
  if (!flashcard?.sides) return map;
  const sideDto = flashcard.sides.find((s) => s.side === side);
  if (!sideDto?.contents) return map;

  sideDto.contents.forEach((c) => {
    if (!c.contentValue) return;
    const rendered = renderContentValue(c);
    if (c.label && c.label.trim()) {
      if (map[c.label.trim()] === undefined) {
        map[c.label.trim()] = rendered;
      }
    }
  });
  return map;
}

/* ─────────────────────────────────────────
   Apply {{Label}} tokens. Case-insensitive fallback so {{kanji}} matches {{Kanji}}.
───────────────────────────────────────── */
function applyTemplate(template: string, labelMap: Record<string, string>): string {
  if (!template) return "";
  const ciMap: Record<string, string> = {};
  for (const [k, v] of Object.entries(labelMap)) ciMap[k.toLowerCase()] = v;
  return template.replace(/\{\{\s*([^}]+?)\s*\}\}/g, (_match, rawLabel: string) => {
    const label = rawLabel.trim();
    if (labelMap[label] !== undefined) return labelMap[label];
    const ci = ciMap[label.toLowerCase()];
    return ci !== undefined ? ci : "";
  });
}

/* ─────────────────────────────────────────
   Starter templates
───────────────────────────────────────── */
function buildSideStarterTemplate(contents: FlashcardSideContentDTO[]): string {
  // Only include content with explicit labels — unlabeled fields can't be referenced.
  const labeled = contents.filter((c) => c.label && c.label.trim());
  if (labeled.length === 0) return "";
  return labeled
    .map((c, i) => {
      const cls = i === 0 ? "card-main" : "card-sub";
      return `<div class="${cls}">{{${c.label!.trim()}}}</div>`;
    })
    .join("\n");
}

function buildStarterTemplate(flashcard: FlashcardDTO | null): {
  frontTemplate: string;
  backTemplate: string;
  styling: string;
} {
  if (!flashcard?.sides) {
    return { frontTemplate: "", backTemplate: "", styling: DEFAULT_STYLING };
  }
  const frontContents = flashcard.sides.find((s) => s.side === "FRONT")?.contents ?? [];
  const backContents = flashcard.sides.find((s) => s.side === "BACK")?.contents ?? [];
  return {
    frontTemplate: buildSideStarterTemplate(frontContents),
    backTemplate: buildSideStarterTemplate(backContents),
    styling: DEFAULT_STYLING,
  };
}

/* ─────────────────────────────────────────
   Component
───────────────────────────────────────── */
export function TemplateEditorModal({ deckId, open, onClose, onSaved }: Props) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);

  const [deck, setDeck] = useState<DeckDTO | null>(null);
  const [templateId, setTemplateId] = useState<number | null>(null);
  const [flashcard, setFlashcard] = useState<FlashcardDTO | null>(null);

  const [draft, setDraft] = useState<DraftForm>(EMPTY_DRAFT);
  const [debouncedDraft, setDebouncedDraft] = useState<DraftForm>(EMPTY_DRAFT);
  const [activeTab, setActiveTab] = useState<EditorTab>("front");
  const [previewSide, setPreviewSide] = useState<FlashcardSideType>("FRONT");

  const frontTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const backTextareaRef = useRef<HTMLTextAreaElement | null>(null);

  /* ── Load when opened ── */
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    setActiveTab("front");
    setPreviewSide("FRONT");

    (async () => {
      try {
        const deckDto = await deckApi.getById(String(deckId));
        if (cancelled) return;
        setDeck(deckDto);

        // Sample flashcard for live preview (first card in deck)
        let sampleCard: FlashcardDTO | null = null;
        try {
          const page = await deckItemApi.getPage(
            { page: 0, size: 1 },
            undefined,
            { deckId } as never
          );
          const firstItem = page.content?.[0];
          if (firstItem?.flashcardId != null) {
            sampleCard = await flashcardApi.getById(String(firstItem.flashcardId));
          }
        } catch {
          // preview falls back to empty data
        }
        if (cancelled) return;
        setFlashcard(sampleCard);

        // Existing deck template?
        if (deckDto.templateId != null) {
          try {
            const tpl = await flashcardTemplateApi.getById(String(deckDto.templateId));
            if (cancelled) return;
            applyTemplateToDraft(tpl);
            setTemplateId(tpl.id ?? null);
            return;
          } catch {
            // template was deleted → fall through to starter
          }
        }

        // No template — seed from the sample card's labels (or synthetic Field1/2/3)
        const starter = buildStarterTemplate(sampleCard);
        setDraft({
          name: DEFAULT_TEMPLATE_NAME,
          description: "",
          frontTemplate: starter.frontTemplate,
          backTemplate: starter.backTemplate,
          styling: starter.styling,
        });
        setTemplateId(null);
      } catch {
        if (!cancelled) toast.error("Failed to load deck template.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, deckId]);

  /* ── Debounce draft → preview ── */
  useEffect(() => {
    const handle = window.setTimeout(() => setDebouncedDraft(draft), PREVIEW_DEBOUNCE_MS);
    return () => window.clearTimeout(handle);
  }, [draft]);

  /* ── Switching tab also flips preview side for convenience ── */
  useEffect(() => {
    if (activeTab === "front") setPreviewSide("FRONT");
    else if (activeTab === "back") setPreviewSide("BACK");
    // CSS tab: keep current previewSide
  }, [activeTab]);

  const applyTemplateToDraft = useCallback((template: FlashcardTemplateDTO) => {
    const frontTemplate = template.frontTemplate ?? "";
    const backTemplate = template.backTemplate ?? "";
    const existingStyling = template.styling ?? "";
    setDraft({
      name: template.name ?? DEFAULT_TEMPLATE_NAME,
      description: template.description ?? "",
      frontTemplate,
      backTemplate,
      styling: existingStyling.trim() ? existingStyling : DEFAULT_STYLING,
    });
  }, []);

  /* ── Save ── */
  const handleSave = async () => {
    if (!draft.name.trim()) {
      toast.error("Template name is required.");
      return;
    }
    setSaving(true);
    try {
      const payload: CreateUpdateTemplateRequest = {
        name: draft.name.trim(),
        cardType: null,
        description: draft.description.trim() || null,
        frontTemplate: draft.frontTemplate || null,
        backTemplate: draft.backTemplate || null,
        styling: draft.styling || null,
        isActive: true,
      };

      if (templateId != null) {
        await flashcardTemplateApi.updateTemplate(templateId, payload);
      } else {
        const created = await flashcardTemplateApi.createTemplate(payload);
        if (created.id == null) throw new Error("Template was created without an id.");
        await deckApi.applyTemplate(deckId, created.id);
        setTemplateId(created.id);
        setDeck((prev) => (prev ? { ...prev, templateId: created.id } : prev));
      }

      toast.success("Template saved.");
      onSaved();
    } catch {
      toast.error("Failed to save template.");
    } finally {
      setSaving(false);
    }
  };

  /* ── Remove template from deck ── */
  const handleRemoveTemplate = async () => {
    if (templateId == null) return;
    setRemoving(true);
    try {
      await deckApi.removeTemplate(deckId);
      const starter = buildStarterTemplate(flashcard);
      setDraft({
        name: DEFAULT_TEMPLATE_NAME,
        description: "",
        frontTemplate: starter.frontTemplate,
        backTemplate: starter.backTemplate,
        styling: starter.styling,
      });
      setTemplateId(null);
      setDeck((prev) => (prev ? { ...prev, templateId: null } : prev));
      toast.success("Template removed from deck.");
      onSaved();
    } catch {
      toast.error("Failed to remove template.");
    } finally {
      setRemoving(false);
    }
  };

  /* ── Load example into the active editor ── */
  const handleLoadExample = () => {
    const starter = buildStarterTemplate(flashcard);
    if (activeTab === "front") setDraft({ ...draft, frontTemplate: starter.frontTemplate });
    else if (activeTab === "back") setDraft({ ...draft, backTemplate: starter.backTemplate });
    else setDraft({ ...draft, styling: starter.styling });
    toast.success("Example loaded.");
  };

  /* ── Insert {{Label}} into active textarea at cursor ── */
  const insertLabelToken = (labelName: string) => {
    const targetSide: EditorTab = activeTab === "css" ? "front" : activeTab;
    if (targetSide !== activeTab) setActiveTab(targetSide);

    const ref = targetSide === "front" ? frontTextareaRef : backTextareaRef;
    const token = `{{${labelName}}}`;

    setTimeout(() => {
      const ta = ref.current;
      if (!ta) {
        // No ref yet — just append
        const key = targetSide === "front" ? "frontTemplate" : "backTemplate";
        setDraft((prev) => ({ ...prev, [key]: (prev[key] ?? "") + token }));
        return;
      }
      const start = ta.selectionStart ?? ta.value.length;
      const end = ta.selectionEnd ?? ta.value.length;
      const before = ta.value.slice(0, start);
      const after = ta.value.slice(end);
      const next = before + token + after;
      if (targetSide === "front") setDraft((prev) => ({ ...prev, frontTemplate: next }));
      else setDraft((prev) => ({ ...prev, backTemplate: next }));
      // restore caret after React updates
      window.setTimeout(() => {
        ta.focus();
        const pos = start + token.length;
        ta.setSelectionRange(pos, pos);
      }, 0);
    }, 0);
  };

  /* ── Build the live preview HTML ── */
  const frontLabelMap = useMemo(() => buildLabelMap(flashcard, "FRONT"), [flashcard]);
  const backLabelMap = useMemo(() => buildLabelMap(flashcard, "BACK"), [flashcard]);

  const renderedFront = useMemo(
    () => applyTemplate(debouncedDraft.frontTemplate, frontLabelMap),
    [debouncedDraft.frontTemplate, frontLabelMap]
  );
  const renderedBack = useMemo(
    () => applyTemplate(debouncedDraft.backTemplate, backLabelMap),
    [debouncedDraft.backTemplate, backLabelMap]
  );

  const previewBodyHtml = useMemo(
    () => (previewSide === "FRONT" ? renderedFront : renderedBack),
    [previewSide, renderedFront, renderedBack]
  );

  const iframeSrcDoc = useMemo(() => {
    const styling = debouncedDraft.styling || "";
    const stripped = previewBodyHtml.replace(/<[^>]*>/g, "").trim();
    const hasVisible =
      stripped.length > 0 ||
      /<(img|audio|video|hr|iframe|svg|canvas)\b/i.test(previewBodyHtml);
    const body = hasVisible
      ? `<div class="card">${previewBodyHtml}</div>`
      : `<div style="display:flex;align-items:center;justify-content:center;height:100vh;text-align:center;color:#9ca3af;font-size:13px;padding:24px;line-height:1.5;font-family:ui-sans-serif,system-ui,sans-serif;">
            <div>
              <div style="font-size:32px;margin-bottom:8px;opacity:0.5;">📝</div>
              <div>Type some HTML with <code style="background:#374151;padding:2px 6px;border-radius:4px;color:#e5e7eb;">{{Label}}</code> tokens<br/>to see a preview here.</div>
            </div>
          </div>`;
    return `<!doctype html><html><head><meta charset="utf-8"><style>
:root { color-scheme: light dark; }
html, body { margin: 0; padding: ${hasVisible ? "0" : "0"}; font-family: ui-sans-serif, system-ui, sans-serif; background: transparent; color: inherit; }
${styling}
</style></head><body>${body}</body></html>`;
  }, [previewBodyHtml, debouncedDraft.styling]);

  /* ── Available labels for the chip row ── */
  const labelSummary = useMemo(() => {
    const side: FlashcardSideType = activeTab === "back" ? "BACK" : "FRONT";
    return buildAvailableLabels(flashcard, side);
  }, [flashcard, activeTab]);

  /* ── Render ── */
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-6xl w-[95vw] max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Card template</DialogTitle>
          <DialogDescription>
            Áp dụng cho tất cả card trong deck này. Use{" "}
            <code className="px-1 py-0.5 rounded bg-muted text-xs">{"{{Label}}"}</code> tokens
            to inject card content.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* ── Left: form ── */}
            <div className="space-y-4">
              {/* Name + description */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label
                    htmlFor="tpl-name"
                    className="text-xs uppercase tracking-wide text-muted-foreground"
                  >
                    Name<span className="text-destructive ml-0.5">*</span>
                  </Label>
                  <Input
                    id="tpl-name"
                    value={draft.name}
                    onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                    placeholder="e.g. Vocabulary deck template"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label
                    htmlFor="tpl-desc"
                    className="text-xs uppercase tracking-wide text-muted-foreground"
                  >
                    Description
                  </Label>
                  <Input
                    id="tpl-desc"
                    value={draft.description}
                    onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                    placeholder="Optional"
                  />
                </div>
              </div>

              {/* Tabs: Front / Back / CSS */}
              <Tabs
                value={activeTab}
                onValueChange={(v) => setActiveTab(v as EditorTab)}
                className="w-full"
              >
                <TabsList className="grid grid-cols-3 w-full">
                  <TabsTrigger value="front">Front</TabsTrigger>
                  <TabsTrigger value="back">Back</TabsTrigger>
                  <TabsTrigger value="css">CSS</TabsTrigger>
                </TabsList>

                {/* Available labels chip row (HTML tabs only) */}
                {activeTab !== "css" && (
                  <AvailableLabelsRow
                    summary={labelSummary}
                    onPick={insertLabelToken}
                    side={activeTab === "back" ? "BACK" : "FRONT"}
                  />
                )}

                <TabsContent value="front" className="space-y-2 mt-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs text-muted-foreground">Front Template</Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={handleLoadExample}
                    >
                      <Sparkles className="size-3 mr-1" />
                      Load example
                    </Button>
                  </div>
                  <Textarea
                    ref={frontTextareaRef}
                    value={draft.frontTemplate}
                    onChange={(e) => setDraft({ ...draft, frontTemplate: e.target.value })}
                    placeholder={'<div class="card-main">{{Field1}}</div>'}
                    rows={12}
                    spellCheck={false}
                    className="font-mono text-xs"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Use <code className="px-1 rounded bg-muted">{"{{label}}"}</code> or{" "}
                    <code className="px-1 rounded bg-muted">{"{{Field1}}"}</code> to inject
                    content from each card.
                  </p>
                </TabsContent>

                <TabsContent value="back" className="space-y-2 mt-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs text-muted-foreground">Back Template</Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={handleLoadExample}
                    >
                      <Sparkles className="size-3 mr-1" />
                      Load example
                    </Button>
                  </div>
                  <Textarea
                    ref={backTextareaRef}
                    value={draft.backTemplate}
                    onChange={(e) => setDraft({ ...draft, backTemplate: e.target.value })}
                    placeholder={'<div class="card-main">{{Field1}}</div>'}
                    rows={12}
                    spellCheck={false}
                    className="font-mono text-xs"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Use <code className="px-1 rounded bg-muted">{"{{label}}"}</code> or{" "}
                    <code className="px-1 rounded bg-muted">{"{{Field1}}"}</code> to inject
                    content from each card.
                  </p>
                </TabsContent>

                <TabsContent value="css" className="space-y-2 mt-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs text-muted-foreground">Styling (CSS)</Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={handleLoadExample}
                    >
                      <Sparkles className="size-3 mr-1" />
                      Load example
                    </Button>
                  </div>
                  <Textarea
                    value={draft.styling}
                    onChange={(e) => setDraft({ ...draft, styling: e.target.value })}
                    placeholder={".card { font-size: 20px; }\n.card-main { font-weight: 700; }"}
                    rows={12}
                    spellCheck={false}
                    className="font-mono text-xs"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Applies to both Front and Back. Use selectors{" "}
                    <code className="px-1 rounded bg-muted">.card</code>,{" "}
                    <code className="px-1 rounded bg-muted">.card-main</code>,{" "}
                    <code className="px-1 rounded bg-muted">.card-sub</code>, or any class you
                    define in the HTML.
                  </p>
                </TabsContent>
              </Tabs>

              {/* Remove template (only when deck has one) */}
              {templateId != null && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleRemoveTemplate}
                  disabled={removing || saving}
                  className="w-full"
                >
                  {removing ? (
                    <Loader2 className="size-3.5 animate-spin mr-1.5" />
                  ) : (
                    <Trash2 className="size-3.5 mr-1.5" />
                  )}
                  Remove template
                </Button>
              )}
            </div>

            {/* ── Right: live preview ── */}
            <div className="space-y-2 min-w-0">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <Label className="text-xs uppercase tracking-wide text-muted-foreground whitespace-nowrap">
                  Live preview
                </Label>
                <div className="flex items-center gap-1 rounded-md border border-border p-0.5 text-xs">
                  <button
                    type="button"
                    onClick={() => setPreviewSide("FRONT")}
                    className={cn(
                      "px-2.5 py-1 rounded transition-colors",
                      previewSide === "FRONT"
                        ? "bg-accent text-foreground font-medium"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    Front
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewSide("BACK")}
                    className={cn(
                      "px-2.5 py-1 rounded transition-colors",
                      previewSide === "BACK"
                        ? "bg-accent text-foreground font-medium"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    Back
                  </button>
                </div>
              </div>
              <iframe
                title="Template preview"
                sandbox=""
                srcDoc={iframeSrcDoc}
                className="w-full h-110 lg:h-140 rounded-lg border border-border bg-background"
              />
              <p className="text-[11px] text-muted-foreground">
                {deck?.title ? (
                  <>
                    Preview uses a sample card from{" "}
                    <span className="font-medium">{deck.title}</span>.
                  </>
                ) : (
                  <>Preview uses a sample card from the deck.</>
                )}
                {!flashcard && (
                  <span className="ml-1 text-amber-600 dark:text-amber-400">
                    No sample card found — add a card to this deck first to see real content.
                  </span>
                )}
              </p>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={onClose} disabled={saving || removing}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || removing || loading}>
            {saving ? (
              <Loader2 className="size-4 animate-spin mr-1.5" />
            ) : (
              <Save className="size-4 mr-1.5" />
            )}
            Save template
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ─────────────────────────────────────────
   Available labels chip row
───────────────────────────────────────── */
function AvailableLabelsRow({
  summary,
  onPick,
  side,
}: {
  summary: SideLabelSummary;
  onPick: (name: string) => void;
  side: FlashcardSideType;
}) {
  const { labels, unlabeledCount } = summary;
  const sideName = side === "FRONT" ? "front" : "back";

  if (labels.length === 0 && unlabeledCount === 0) {
    return (
      <div className="mt-3 text-[11px] text-muted-foreground rounded-md border border-dashed border-border px-3 py-2">
        The sample card has no content on its {sideName} side. Add content to a card in this
        deck to make labels appear here.
      </div>
    );
  }

  return (
    <div className="mt-3 space-y-1.5">
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">
        Available labels · click to insert
      </p>

      {labels.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {labels.map((lbl, i) => {
            const Icon =
              lbl.contentType === "IMAGE"
                ? ImageIcon
                : lbl.contentType === "AUDIO"
                  ? Mic
                  : lbl.contentType === "VIDEO"
                    ? Video
                    : lbl.contentType === "CLOZE"
                      ? Square
                      : Type;
            const previewText =
              lbl.contentType === "IMAGE"
                ? "image"
                : lbl.contentType === "AUDIO"
                  ? "audio"
                  : lbl.contentType === "VIDEO"
                    ? "video"
                    : lbl.preview;
            return (
              <button
                key={`${lbl.name}-${i}`}
                type="button"
                onClick={() => onPick(lbl.name)}
                title={`Click to insert {{${lbl.name}}} · ${lbl.contentType} · ${lbl.preview}`}
                className="group flex flex-col items-start gap-0.5 px-2.5 py-1.5 rounded-lg border border-primary/40 bg-primary/5 hover:bg-primary/10 hover:border-primary/60 text-left transition-all max-w-45"
              >
                <div className="flex items-center gap-1.5">
                  <Icon className="size-3 shrink-0 text-primary" />
                  <span className="font-mono text-[11px] font-semibold text-primary">
                    {"{{"}
                    {lbl.name}
                    {"}}"}
                  </span>
                </div>
                <span className="text-[10px] text-muted-foreground truncate max-w-full w-full">
                  {previewText}
                </span>
              </button>
            );
          })}
        </div>
      ) : (
        <p className="text-[11px] text-muted-foreground italic">
          No labeled fields on the {sideName} side yet.
        </p>
      )}

      {unlabeledCount > 0 && (
        <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-2 flex items-start gap-1.5">
          <span aria-hidden>⚠</span>
          <span>
            {unlabeledCount} unlabeled {unlabeledCount === 1 ? "field" : "fields"} on the{" "}
            {sideName} side {unlabeledCount === 1 ? "is" : "are"} hidden. Open{" "}
            <span className="font-semibold">Edit card</span> and add a label to each field
            you want to use in the template.
          </span>
        </p>
      )}
    </div>
  );
}
