import { useCallback, useEffect, useMemo, useState } from "react";
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
import { Loader2, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type {
  CreateUpdateTemplateRequest,
  DeckDTO,
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

const PREVIEW_DEBOUNCE_MS = 500;
const DEFAULT_TEMPLATE_NAME = "Deck template";

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

/* ─────────────────────────────────────────
   Starter template from the sample card's labels
───────────────────────────────────────── */
function buildSideStarterTemplate(contents: FlashcardSideContentDTO[]): string {
  const labels = contents
    .filter((c) => c.label && c.label.trim().length > 0)
    .map((c) => c.label!.trim());
  if (labels.length === 0) return "";
  return labels
    .map((label, i) =>
      i === 0
        ? `<div class="card-main">{{${label}}}</div>`
        : `<div class="card-sub">{{${label}}}</div>`
    )
    .join("\n");
}

function buildStarterTemplate(flashcard: FlashcardDTO | null): {
  frontTemplate: string;
  backTemplate: string;
  styling: string;
} {
  if (!flashcard?.sides) {
    return { frontTemplate: "", backTemplate: "", styling: "" };
  }
  const frontContents = flashcard.sides.find((s) => s.side === "FRONT")?.contents ?? [];
  const backContents = flashcard.sides.find((s) => s.side === "BACK")?.contents ?? [];
  const frontTemplate = buildSideStarterTemplate(frontContents);
  const backTemplate = buildSideStarterTemplate(backContents);
  return {
    frontTemplate,
    backTemplate,
    styling: buildExampleStyling(frontTemplate, backTemplate),
  };
}

/* ─────────────────────────────────────────
   Example CSS stubs from class="..." attrs in the HTML
───────────────────────────────────────── */
function buildExampleStyling(frontTemplate: string, backTemplate: string): string {
  const combined = `${frontTemplate ?? ""}\n${backTemplate ?? ""}`;
  const classes = new Set<string>();
  for (const match of combined.matchAll(/class\s*=\s*["']([^"']+)["']/g)) {
    for (const cls of match[1].split(/\s+/)) {
      const trimmed = cls.trim();
      if (trimmed) classes.add(trimmed);
    }
  }
  if (classes.size === 0) {
    return [
      "/* Example styling — edit to customize */",
      ".card {",
      "  font-size: 20px;",
      "  text-align: center;",
      "  padding: 16px;",
      "}",
    ].join("\n");
  }
  const stubs = [...classes].map((cls) => {
    if (cls === "card-main") {
      return ".card-main {\n  font-size: 24px;\n  font-weight: 600;\n  text-align: center;\n  margin-bottom: 8px;\n}";
    }
    if (cls === "card-sub") {
      return ".card-sub {\n  font-size: 14px;\n  opacity: 0.75;\n  text-align: center;\n  margin: 4px 0;\n}";
    }
    return `.${cls} {\n  /* your styles here */\n}`;
  });
  return ["/* Example styling — edit to customize */", ...stubs].join("\n\n");
}

/* ─────────────────────────────────────────
   buildLabelMap & applyTemplate (live preview)
───────────────────────────────────────── */
function buildLabelMap(
  flashcard: FlashcardDTO | null,
  side: FlashcardSideType
): Record<string, string> {
  const map: Record<string, string> = {};
  if (!flashcard?.sides) return map;
  const sideDto = flashcard.sides.find((s) => s.side === side);
  if (!sideDto?.contents) return map;
  for (const c of sideDto.contents) {
    if (!c.label) continue;
    if (!c.contentValue) continue;
    if (map[c.label] === undefined) {
      map[c.label] = c.contentValue;
    }
  }
  return map;
}

function applyTemplate(template: string, labelMap: Record<string, string>): string {
  if (!template) return "";
  return template.replace(/\{\{\s*([^}]+?)\s*\}\}/g, (_match, rawLabel: string) => {
    const label = rawLabel.trim();
    return labelMap[label] ?? "";
  });
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
  const [previewSide, setPreviewSide] = useState<FlashcardSideType>("FRONT");

  /* ── Load when opened ── */
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);

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
            // template was deleted → fall through to empty draft
          }
        }

        // No template — seed from the sample card's labels
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

  const applyTemplateToDraft = useCallback((template: FlashcardTemplateDTO) => {
    const frontTemplate = template.frontTemplate ?? "";
    const backTemplate = template.backTemplate ?? "";
    const existingStyling = template.styling ?? "";
    const seededStyling = existingStyling.trim()
      ? existingStyling
      : buildExampleStyling(frontTemplate, backTemplate);
    setDraft({
      name: template.name ?? DEFAULT_TEMPLATE_NAME,
      description: template.description ?? "",
      frontTemplate,
      backTemplate,
      styling: seededStyling,
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
        // Deck already points to this template — just update it
        await flashcardTemplateApi.updateTemplate(templateId, payload);
      } else {
        // Create the template and apply it to the deck
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

  /* ── Preview ── */
  const labelMap = useMemo(
    () => buildLabelMap(flashcard, previewSide),
    [flashcard, previewSide]
  );

  const previewBodyHtml = useMemo(() => {
    const tmpl =
      previewSide === "FRONT" ? debouncedDraft.frontTemplate : debouncedDraft.backTemplate;
    return applyTemplate(tmpl, labelMap);
  }, [debouncedDraft.frontTemplate, debouncedDraft.backTemplate, labelMap, previewSide]);

  const iframeSrcDoc = useMemo(() => {
    const escapedStyle = debouncedDraft.styling || "";
    const hasContent = previewBodyHtml.trim().length > 0;
    const body = hasContent
      ? `<div class="card">${previewBodyHtml}</div>`
      : `<div style="display:flex;align-items:center;justify-content:center;height:100vh;text-align:center;color:#9ca3af;font-size:13px;padding:24px;line-height:1.5;">
            <div>
              <div style="font-size:32px;margin-bottom:8px;opacity:0.5;">📝</div>
              <div>Type some HTML with <code style="background:#374151;padding:2px 6px;border-radius:4px;color:#e5e7eb;">{{Label}}</code> tokens<br/>to see a preview here.</div>
            </div>
          </div>`;
    return `<!doctype html><html><head><meta charset="utf-8"><style>
:root { color-scheme: light dark; }
html, body { margin: 0; padding: ${hasContent ? "16px" : "0"}; font-family: ui-sans-serif, system-ui, sans-serif; background: transparent; color: inherit; }
${escapedStyle}
</style></head><body>${body}</body></html>`;
  }, [previewBodyHtml, debouncedDraft.styling]);

  /* ── Render ── */
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-5xl w-[95vw] max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Card template</DialogTitle>
          <DialogDescription>
            Áp dụng cho tất cả card trong deck này. Use{" "}
            <code className="px-1 py-0.5 rounded bg-muted text-xs">{"{{Label}}"}</code> tokens to
            inject card content.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* ── Left: form ── */}
            <div className="space-y-5">
              {/* Name + description */}
              <div className="space-y-3">
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
              <Tabs defaultValue="front" className="w-full">
                <TabsList className="grid grid-cols-3 w-full">
                  <TabsTrigger value="front">Front</TabsTrigger>
                  <TabsTrigger value="back">Back</TabsTrigger>
                  <TabsTrigger value="css">CSS</TabsTrigger>
                </TabsList>

                <TabsContent value="front" className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Front Template</Label>
                  <Textarea
                    value={draft.frontTemplate}
                    onChange={(e) => setDraft({ ...draft, frontTemplate: e.target.value })}
                    placeholder={"<b>{{Kanji}}</b>\n<hr>\n<span>{{Reading}}</span>"}
                    rows={10}
                    className="font-mono text-xs"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Use <code>{"{{label}}"}</code> to inject content from each card.
                  </p>
                </TabsContent>

                <TabsContent value="back" className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Back Template</Label>
                  <Textarea
                    value={draft.backTemplate}
                    onChange={(e) => setDraft({ ...draft, backTemplate: e.target.value })}
                    placeholder={"<b>{{Meaning}}</b>\n<div>{{Example}}</div>"}
                    rows={10}
                    className="font-mono text-xs"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Use <code>{"{{label}}"}</code> to inject content from each card.
                  </p>
                </TabsContent>

                <TabsContent value="css" className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Styling (CSS)</Label>
                  <Textarea
                    value={draft.styling}
                    onChange={(e) => setDraft({ ...draft, styling: e.target.value })}
                    placeholder={".card { font-size: 20px; }\n.sub { color: grey; }"}
                    rows={10}
                    className="font-mono text-xs"
                  />
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
                    onClick={() => setPreviewSide("FRONT")}
                    className={cn(
                      "px-2 py-1 rounded transition-colors",
                      previewSide === "FRONT"
                        ? "bg-accent text-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    Front
                  </button>
                  <button
                    onClick={() => setPreviewSide("BACK")}
                    className={cn(
                      "px-2 py-1 rounded transition-colors",
                      previewSide === "BACK"
                        ? "bg-accent text-foreground"
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
                className="w-full h-[420px] lg:h-[520px] rounded-lg border border-border bg-background"
              />
              {deck?.title && (
                <p className="text-[11px] text-muted-foreground">
                  Preview uses a sample card from <span className="font-medium">{deck.title}</span>.
                </p>
              )}
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
