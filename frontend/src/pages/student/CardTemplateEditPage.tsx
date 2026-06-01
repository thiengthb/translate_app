import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { flashcardTemplateApi } from "@/api";
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
} from "@/features/card-template-designer/template-generation";
import type {
  AvailableTemplateField,
  CardTemplateBuilderState,
  TemplateSide,
} from "@/features/card-template-designer/types";
import type { FlashcardContentType, FlashcardTemplateDTO } from "@/types";
import { getCurrentUserId } from "@/utils/auth.utils";
import { InfoLabel } from "@/components/common/InfoLabel";
import {
  defaultFields,
  fieldsFromBuilderConfig,
  FieldStructureEditor,
  type FieldDef,
} from "./shared/FieldDeckEditor";

const PREVIEW_DEBOUNCE_MS = 120;
const DEFAULT_TEMPLATE_NAME = "Mẫu thẻ mới";

const EMPTY_DRAFT: TemplateDraftFields = {
  name: DEFAULT_TEMPLATE_NAME,
  description: "",
  frontTemplate: "",
  backTemplate: "",
  styling: "",
};

/* ── Preview rendering (mirrors AnkiTemplateEditPage; deckless sample values) ── */

function appForegroundColor(): string {
  if (typeof window === "undefined") return "#1f2937";
  const v = getComputedStyle(document.documentElement).getPropertyValue("--foreground").trim();
  return v || "#1f2937";
}

function sampleFor(type: FlashcardContentType, label: string): string {
  switch (type) {
    case "IMAGE":
      return '<span style="display:inline-block;width:72px;height:48px;border-radius:8px;background:#d1d5db;"></span>';
    case "AUDIO":
      return "🔊";
    case "VIDEO":
      return "🎬";
    default:
      return label;
  }
}

function applyTemplate(template: string, labelMap: Record<string, string>): string {
  if (!template) return "";
  const ci: Record<string, string> = {};
  for (const [k, v] of Object.entries(labelMap)) ci[k.toLowerCase()] = v;
  return template.replace(/\{\{\s*([^}]+?)\s*\}\}/g, (_m, raw: string) => {
    const l = raw.trim();
    if (labelMap[l] !== undefined) return labelMap[l];
    return ci[l.toLowerCase()] ?? "";
  });
}

function createIframeDoc(bodyHtml: string, styling: string): string {
  const stripped = bodyHtml.replace(/<[^>]*>/g, "").trim();
  const hasVisible = stripped.length > 0 || /<(img|audio|video|hr|iframe|svg|canvas|span)\b/i.test(bodyHtml);
  const body = hasVisible
    ? `<div class="card">${bodyHtml}</div>`
    : `<div style="display:flex;align-items:center;justify-content:center;height:100vh;text-align:center;color:#8b8f85;font-size:14px;font-family:ui-sans-serif,system-ui,sans-serif;padding:24px;">Bật một trường ở mặt này để xem trước</div>`;
  return `<!doctype html><html><head><meta charset="utf-8"><style>
:root { color-scheme: light dark; }
html, body { margin: 0; height: 100%; background: transparent; color: ${appForegroundColor()}; }
${styling}
</style></head><body>${body}</body></html>`;
}

function fieldsToAvailable(fields: FieldDef[]): AvailableTemplateField[] {
  return fields.map((f) => ({
    name: f.name,
    side: f.side,
    contentType: f.type,
    label: f.name,
    preview: f.name,
  }));
}

/**
 * Standalone card-template designer — create or edit a template that is NOT
 * tied to any deck. Reached from the "Card templates" management ProTable
 * (Create button / row Edit). Fields are defined here (there's no deck sample
 * card to derive them from); the same designer used for deck templates then
 * lays them out, and the result is persisted straight to the template entity.
 */
export default function CardTemplateEditPage() {
  const { templateId: idParam } = useParams<{ templateId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const userId = getCurrentUserId();
  const isEdit = idParam != null;
  const templateId = idParam ? Number(idParam) : null;
  const backTo = "/library?tab=template";

  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [fields, setFields] = useState<FieldDef[]>(() => defaultFields());
  const [draft, setDraft] = useState<TemplateDraftFields>(EMPTY_DRAFT);
  const [debouncedDraft, setDebouncedDraft] = useState<TemplateDraftFields>(EMPTY_DRAFT);
  const [builderState, setBuilderState] = useState<CardTemplateBuilderState>(() => createEmptyState());
  const [previewSide, setPreviewSide] = useState<TemplateSide>("FRONT");
  const [advancedMode, setAdvancedMode] = useState(false);
  const [customCode, setCustomCode] = useState(false);
  const [dirty, setDirty] = useState(false);
  // Preserve the template's share state across edits (defaults to private).
  const [visibility, setVisibility] = useState<"PUBLIC" | "PRIVATE">("PRIVATE");

  /** Builder changes → regenerate templates unless the user is in custom-code mode. */
  const setBuilderAndGenerate = useCallback((next: CardTemplateBuilderState) => {
    const generated = generateTemplates(next);
    setDirty(true);
    setBuilderState(next);
    setDraft((cur) => ({ ...cur, ...generated }));
  }, []);

  const handleDraftChange = useCallback((next: TemplateDraftFields) => {
    setDirty(true);
    setDraft(next);
  }, []);

  const handleFieldsChange = useCallback((next: FieldDef[]) => {
    setDirty(true);
    setFields(next);
  }, []);

  /* ── Init: fresh structure for create, or load the existing template. ── */
  useEffect(() => {
    if (!isEdit) {
      const f = defaultFields();
      const state = buildStateFromFields(fieldsToAvailable(f));
      const generated = generateTemplates(state);
      setFields(f);
      setBuilderState(state);
      setDraft({ name: DEFAULT_TEMPLATE_NAME, description: "", ...generated });
      setCustomCode(false);
      // Create mode: there's a valid default template to save right away, so the
      // designer's Save button must be enabled (it disables when dirty === false).
      setDirty(true);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    flashcardTemplateApi
      .getById(String(templateId))
      .then((tpl) => {
        if (cancelled) return;
        const recovered = fieldsFromBuilderConfig(tpl.builderConfigJson);
        const resolvedFields = recovered.length > 0 ? recovered : defaultFields();
        const savedState = parseBuilderConfig(tpl.builderConfigJson);
        const hasCustom = !savedState && !!(tpl.frontTemplate?.trim() || tpl.backTemplate?.trim());
        const resolvedState =
          savedState ?? (hasCustom ? createEmptyState() : buildStateFromFields(fieldsToAvailable(resolvedFields)));

        setFields(resolvedFields);
        setCustomCode(hasCustom);
        setBuilderState(resolvedState);
        setVisibility(tpl.visibility === "PUBLIC" ? "PUBLIC" : "PRIVATE");
        setDraft({
          name: tpl.name ?? DEFAULT_TEMPLATE_NAME,
          description: tpl.description ?? "",
          frontTemplate: tpl.frontTemplate ?? "",
          backTemplate: tpl.backTemplate ?? "",
          styling: tpl.styling ?? "",
        });
        setDirty(false);
      })
      .catch(() => !cancelled && toast.error("Không tải được mẫu thẻ."))
      .finally(() => !cancelled && setLoading(false));

    return () => {
      cancelled = true;
    };
  }, [isEdit, templateId]);

  useEffect(() => {
    const h = window.setTimeout(() => setDebouncedDraft(draft), PREVIEW_DEBOUNCE_MS);
    return () => window.clearTimeout(h);
  }, [draft]);

  const availableFields = useMemo(() => fieldsToAvailable(fields), [fields]);

  const previewSrcDoc = useMemo(() => {
    const labelMap: Record<string, string> = {};
    for (const f of fields) {
      if (f.side === previewSide) labelMap[f.name] = sampleFor(f.type, f.name);
    }
    const html =
      previewSide === "FRONT"
        ? applyTemplate(debouncedDraft.frontTemplate, labelMap)
        : applyTemplate(debouncedDraft.backTemplate, labelMap);
    return createIframeDoc(html, debouncedDraft.styling);
  }, [fields, debouncedDraft, previewSide]);

  const handleSave = async () => {
    if (!draft.name.trim()) {
      toast.error("Tên mẫu là bắt buộc.");
      return;
    }
    if (!customCode && (!hasEnabledBlock(builderState, "FRONT") || !hasEnabledBlock(builderState, "BACK"))) {
      toast.error("Mặt trước và mặt sau mỗi mặt cần ít nhất một trường được bật.");
      return;
    }
    if (!draft.frontTemplate.trim() || !draft.backTemplate.trim()) {
      toast.error("Mẫu mặt trước và mặt sau không được để trống.");
      return;
    }

    setSaving(true);
    try {
      const dto = {
        userId,
        cardType: null,
        name: draft.name.trim(),
        description: draft.description.trim() || null,
        frontTemplate: draft.frontTemplate || null,
        backTemplate: draft.backTemplate || null,
        styling: draft.styling || null,
        builderConfigJson: customCode ? null : JSON.stringify(builderState),
        isSystem: false,
        isDefault: false,
        visibility,
        isActive: true, // BaseDTO requires @NotNull(isActive) on create
      } as FlashcardTemplateDTO;

      if (isEdit && templateId != null) {
        await flashcardTemplateApi.update(String(templateId), dto);
        toast.success("Đã lưu mẫu thẻ.");
      } else {
        await flashcardTemplateApi.create(dto);
        toast.success("Đã tạo mẫu thẻ.");
      }
      navigate(backTo);
    } catch {
      toast.error("Lưu mẫu thẻ thất bại.");
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async () => {
    if (!isEdit || templateId == null) return;
    setRemoving(true);
    try {
      await flashcardTemplateApi.deleteTemplate(templateId);
      toast.success("Đã xóa mẫu thẻ.");
      navigate(backTo);
    } catch {
      toast.error("Xóa mẫu thẻ thất bại.");
    } finally {
      setRemoving(false);
    }
  };

  return (
    <MainLayout
      parentCrumb={{ href: "/library?tab=template", title: "Mẫu thẻ" }}
      ignorePaths={["card-templates", String(templateId ?? "")]}
      pathName={{ [location.pathname]: isEdit ? "Sửa mẫu thẻ" : "Tạo mẫu thẻ" }}
    >
      {loading ? (
        <div className="flex flex-1 min-h-0 items-center justify-center">
          <Loader2 className="size-6 animate-spin text-primary" />
        </div>
      ) : (
        <div className="flex flex-1 min-h-0 flex-col gap-3">
          {/* Field structure — a deckless template defines its own fields here. */}
          <div className="shrink-0 space-y-2 rounded-xl border border-border bg-card p-4 shadow-sm">
            <InfoLabel
              title={<p className="text-sm font-semibold text-foreground">Trường của mẫu</p>}
              info="Các trường mà mẫu này tham chiếu qua {{Tên trường}}. Khi áp dụng cho deck, nội dung thẻ có nhãn trùng tên sẽ được điền vào."
              side="right"
            />
            <FieldStructureEditor fields={fields} onChange={handleFieldsChange} />
          </div>

          {/* The same designer used for deck templates. */}
          <DeckTemplateDesigner
            className="flex-1 min-h-0 overflow-hidden"
            draft={draft}
            builderState={builderState}
            availableFields={availableFields}
            previewSide={previewSide}
            previewSrcDoc={previewSrcDoc}
            advancedMode={advancedMode}
            customCode={customCode}
            saving={saving}
            removing={removing}
            hasTemplate={isEdit}
            hasSampleCard={availableFields.length > 0}
            dirty={dirty}
            onDraftChange={handleDraftChange}
            onBuilderChange={setBuilderAndGenerate}
            onPreviewSideChange={setPreviewSide}
            onAdvancedModeChange={setAdvancedMode}
            onCustomCodeChange={setCustomCode}
            onSave={handleSave}
            onCancel={() => navigate(backTo)}
            onRemoveTemplate={handleRemove}
          />
        </div>
      )}
    </MainLayout>
  );
}
