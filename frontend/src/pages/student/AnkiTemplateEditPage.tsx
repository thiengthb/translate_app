import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { deckApi, deckItemApi, flashcardApi, flashcardTemplateApi } from "@/api";
import { MainLayout } from "@/components/layout/MainLayout";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  DeckTemplateDesigner,
  type TemplateDraftFields,
} from "@/features/card-template-designer/DeckTemplateDesigner";
import { buildStateFromFields, createEmptyState } from "@/features/card-template-designer/presets";
import {
  generateTemplates,
  hasEnabledBlock,
  parseBuilderConfig,
  reconcileWithFields,
} from "@/features/card-template-designer/template-generation";
import type {
  AvailableTemplateField,
  CardTemplateBuilderState,
  TemplateSide,
} from "@/features/card-template-designer/types";
import type {
  CreateUpdateTemplateRequest,
  DeckDTO,
  FlashcardDTO,
  FlashcardSideContentDTO,
  FlashcardSideType,
  FlashcardTemplateDTO,
} from "@/types";

const PREVIEW_DEBOUNCE_MS = 120;
const DEFAULT_TEMPLATE_NAME = "Deck template";

const EMPTY_DRAFT: TemplateDraftFields = {
  name: DEFAULT_TEMPLATE_NAME,
  description: "",
  frontTemplate: "",
  backTemplate: "",
  styling: "",
};

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

function getSideContents(
  flashcard: FlashcardDTO | null,
  side: FlashcardSideType
): FlashcardSideContentDTO[] {
  return flashcard?.sides?.find((item) => item.side === side)?.contents ?? [];
}

/**
 * Build the visible field list from a sample card. We prefer the user's explicit
 * label (e.g. "Word", "Reading"). When no label is set we expose a synthetic
 * `Field1`, `Field2`... so templates always work.
 */
function buildAvailableFields(flashcard: FlashcardDTO | null): AvailableTemplateField[] {
  const fields: AvailableTemplateField[] = [];
  const sides: TemplateSide[] = ["FRONT", "BACK"];

  for (const side of sides) {
    getSideContents(flashcard, side).forEach((content, index) => {
      if (!content.contentValue) return;

      const preview =
        content.contentValue.length > 36
          ? `${content.contentValue.slice(0, 36)}...`
          : content.contentValue;

      const explicitLabel = content.label?.trim();
      const name = explicitLabel || `Field${index + 1}`;
      const label = explicitLabel || `Field ${index + 1}`;

      fields.push({
        name,
        side,
        contentType: content.contentType,
        label,
        preview,
      });
    });
  }

  return fields;
}

function buildLabelMap(
  flashcard: FlashcardDTO | null,
  side: FlashcardSideType
): Record<string, string> {
  const map: Record<string, string> = {};

  getSideContents(flashcard, side).forEach((content, index) => {
    if (!content.contentValue) return;
    const rendered = renderContentValue(content);
    map[`Field${index + 1}`] = rendered;
    if (content.label?.trim() && map[content.label.trim()] === undefined) {
      map[content.label.trim()] = rendered;
    }
  });

  return map;
}

function applyTemplate(template: string, labelMap: Record<string, string>): string {
  if (!template) return "";
  const ciMap: Record<string, string> = {};
  for (const [key, value] of Object.entries(labelMap)) {
    ciMap[key.toLowerCase()] = value;
  }
  return template.replace(/\{\{\s*([^}]+?)\s*\}\}/g, (_match, rawLabel: string) => {
    const label = rawLabel.trim();
    if (labelMap[label] !== undefined) return labelMap[label];
    return ciMap[label.toLowerCase()] ?? "";
  });
}

/** Resolve the app's theme foreground colour so iframe content stays readable
 *  on both light and dark backgrounds (the iframe is isolated and can't see the
 *  app's CSS variables, and bare `inherit` falls back to the UA default black). */
function appForegroundColor(): string {
  if (typeof window === "undefined") return "#1f2937";
  const v = getComputedStyle(document.documentElement)
    .getPropertyValue("--foreground")
    .trim();
  return v || "#1f2937";
}

function createIframeDoc(bodyHtml: string, styling: string): string {
  const stripped = bodyHtml.replace(/<[^>]*>/g, "").trim();
  const hasVisible =
    stripped.length > 0 || /<(img|audio|video|hr|iframe|svg|canvas)\b/i.test(bodyHtml);
  const body = hasVisible
    ? `<div class="card">${bodyHtml}</div>`
    : `<div style="display:flex;align-items:center;justify-content:center;height:100vh;text-align:center;color:#8b8f85;font-size:14px;padding:24px;line-height:1.5;font-family:ui-sans-serif,system-ui,sans-serif;">
        <div>
          <div style="font-size:32px;margin-bottom:8px;opacity:.45;">Preview</div>
          <div>No visible content yet. Enable a field on this side to start.</div>
        </div>
      </div>`;

  return `<!doctype html><html><head><meta charset="utf-8"><style>
:root { color-scheme: light dark; }
html, body { margin: 0; height: 100%; background: transparent; color: ${appForegroundColor()}; }
${styling}
</style></head><body>${body}</body></html>`;
}

/**
 * Decide the initial builder state when the page opens.
 *
 * Priority:
 *   1. saved builderConfigJson — reconciled against current fields
 *   2. no saved config but template exists → treat as custom code (no auto blocks)
 *   3. no template at all → auto-build from sample card fields
 */
function resolveInitialState(
  template: FlashcardTemplateDTO | null,
  fields: AvailableTemplateField[]
): { state: CardTemplateBuilderState; customCode: boolean } {
  const saved = parseBuilderConfig(template?.builderConfigJson);
  if (saved) {
    return { state: reconcileWithFields(saved, fields), customCode: false };
  }

  if (template && (template.frontTemplate?.trim() || template.backTemplate?.trim())) {
    return { state: createEmptyState(), customCode: true };
  }

  return { state: buildStateFromFields(fields), customCode: false };
}

/**
 * Editor for a deck's card template. Reached from the Anki study toolbar's
 * "Template" action — replaces the former modal so the designer gets its own
 * route. Rendered inside MainLayout (sidebar + breadcrumbs) like the card
 * editor, with the two-pane designer filling the layout's content column.
 */
export default function AnkiTemplateEditPage() {
  const { deckId: deckIdParam } = useParams<{ deckId: string }>();
  const navigate = useNavigate();
  const deckId = Number(deckIdParam);
  const backTo = `/deck/${deckIdParam}/anki`;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [deck, setDeck] = useState<DeckDTO | null>(null);
  const [templateId, setTemplateId] = useState<number | null>(null);
  const [flashcard, setFlashcard] = useState<FlashcardDTO | null>(null);
  const [draft, setDraft] = useState<TemplateDraftFields>(EMPTY_DRAFT);
  const [debouncedDraft, setDebouncedDraft] = useState<TemplateDraftFields>(EMPTY_DRAFT);
  const [builderState, setBuilderState] = useState<CardTemplateBuilderState>(() => createEmptyState());
  const [previewSide, setPreviewSide] = useState<TemplateSide>("FRONT");
  const [advancedMode, setAdvancedMode] = useState(false);
  const [customCode, setCustomCode] = useState(false);

  /** Builder changes → regenerate templates (unless user has switched to advanced/custom) */
  const setBuilderAndGenerate = useCallback((next: CardTemplateBuilderState) => {
    const generated = generateTemplates(next);
    setBuilderState(next);
    setDraft((current) => ({ ...current, ...generated }));
  }, []);

  useEffect(() => {
    if (!deckIdParam) return;
    let cancelled = false;
    setLoading(true);
    setPreviewSide("FRONT");
    setAdvancedMode(false);
    setCustomCode(false);

    (async () => {
      try {
        const deckDto = await deckApi.getById(String(deckId));
        if (cancelled) return;
        setDeck(deckDto);

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
          sampleCard = null;
        }
        if (cancelled) return;
        setFlashcard(sampleCard);

        const fields = buildAvailableFields(sampleCard);
        let template: FlashcardTemplateDTO | null = null;
        if (deckDto.templateId != null) {
          try {
            template = await flashcardTemplateApi.getById(String(deckDto.templateId));
          } catch {
            template = null;
          }
        }
        if (cancelled) return;

        const { state, customCode: hasCustomCode } = resolveInitialState(template, fields);
        setBuilderState(state);
        setCustomCode(hasCustomCode);
        setTemplateId(template?.id ?? null);

        if (template) {
          const generated = generateTemplates(state);
          setDraft({
            name: template.name ?? DEFAULT_TEMPLATE_NAME,
            description: template.description ?? "",
            frontTemplate: hasCustomCode
              ? template.frontTemplate ?? generated.frontTemplate
              : generated.frontTemplate,
            backTemplate: hasCustomCode
              ? template.backTemplate ?? generated.backTemplate
              : generated.backTemplate,
            styling: hasCustomCode ? template.styling ?? generated.styling : generated.styling,
          });
        } else {
          const generated = generateTemplates(state);
          setDraft({
            name: DEFAULT_TEMPLATE_NAME,
            description: "",
            frontTemplate: generated.frontTemplate,
            backTemplate: generated.backTemplate,
            styling: generated.styling,
          });
        }
      } catch {
        if (!cancelled) toast.error("Failed to load deck template.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [deckId, deckIdParam]);

  useEffect(() => {
    const handle = window.setTimeout(() => setDebouncedDraft(draft), PREVIEW_DEBOUNCE_MS);
    return () => window.clearTimeout(handle);
  }, [draft]);

  const availableFields = useMemo(() => buildAvailableFields(flashcard), [flashcard]);
  const frontLabelMap = useMemo(() => buildLabelMap(flashcard, "FRONT"), [flashcard]);
  const backLabelMap = useMemo(() => buildLabelMap(flashcard, "BACK"), [flashcard]);

  const previewSrcDoc = useMemo(() => {
    const html =
      previewSide === "FRONT"
        ? applyTemplate(debouncedDraft.frontTemplate, frontLabelMap)
        : applyTemplate(debouncedDraft.backTemplate, backLabelMap);
    return createIframeDoc(html, debouncedDraft.styling);
  }, [backLabelMap, debouncedDraft, frontLabelMap, previewSide]);

  const handleSave = async () => {
    if (!draft.name.trim()) {
      toast.error("Template name is required.");
      return;
    }
    if (!customCode) {
      if (!hasEnabledBlock(builderState, "FRONT") || !hasEnabledBlock(builderState, "BACK")) {
        toast.error("Front and Back each need at least one enabled field.");
        return;
      }
    }
    if (!draft.frontTemplate.trim() || !draft.backTemplate.trim()) {
      toast.error("Front and Back templates cannot be empty.");
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
        builderConfigJson: customCode ? null : JSON.stringify(builderState),
        isActive: true,
      };

      if (templateId != null) {
        await flashcardTemplateApi.updateTemplate(templateId, payload);
      } else {
        const created = await flashcardTemplateApi.createTemplate(payload);
        if (created.id == null) throw new Error("Template was created without an id.");
        await deckApi.applyTemplate(deckId, created.id);
      }

      toast.success("Template saved.");
      navigate(backTo);
    } catch {
      toast.error("Failed to save template.");
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveTemplate = async () => {
    if (templateId == null) return;
    setRemoving(true);
    try {
      await deckApi.removeTemplate(deckId);
      const fields = buildAvailableFields(flashcard);
      const state = buildStateFromFields(fields);
      const generated = generateTemplates(state);
      setBuilderState(state);
      setDraft({ ...EMPTY_DRAFT, ...generated });
      setTemplateId(null);
      setDeck((current) => (current ? { ...current, templateId: null } : current));
      setCustomCode(false);
      toast.success("Template removed from deck.");
    } catch {
      toast.error("Failed to remove template.");
    } finally {
      setRemoving(false);
    }
  };

  return (
    <MainLayout
      parentCrumb={{ href: backTo, title: "Study" }}
      ignorePaths={["deck", String(deckIdParam), "anki", "template"]}
      pathName={{
        [`/deck/${deckIdParam}/anki/template`]: "Card template",
      }}
    >
      {loading ? (
        <div className="flex flex-1 min-h-0 items-center justify-center">
          <Loader2 className="size-6 animate-spin text-primary" />
        </div>
      ) : (
        <DeckTemplateDesigner
          className="flex-1 min-h-0 overflow-hidden rounded-xl border border-border"
          deckTitle={deck?.title}
          draft={draft}
          builderState={builderState}
          availableFields={availableFields}
          previewSide={previewSide}
          previewSrcDoc={previewSrcDoc}
          advancedMode={advancedMode}
          customCode={customCode}
          saving={saving}
          removing={removing}
          hasTemplate={templateId != null}
          hasSampleCard={flashcard != null}
          onDraftChange={setDraft}
          onBuilderChange={setBuilderAndGenerate}
          onPreviewSideChange={setPreviewSide}
          onAdvancedModeChange={setAdvancedMode}
          onCustomCodeChange={setCustomCode}
          onSave={handleSave}
          onCancel={() => navigate(backTo)}
          onRemoveTemplate={handleRemoveTemplate}
        />
      )}
    </MainLayout>
  );
}
