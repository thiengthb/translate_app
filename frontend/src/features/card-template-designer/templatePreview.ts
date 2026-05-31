/**
 * Render a saved flashcard template to a self-contained iframe `srcdoc` for
 * preview, using sample values derived from the template's builder config (or,
 * as a fallback, the `{{token}}`s found in the template HTML).
 */
import { parseBuilderConfig } from "./template-generation";
import type { TemplateSide } from "./types";

interface PreviewableTemplate {
  frontTemplate?: string | null;
  backTemplate?: string | null;
  styling?: string | null;
  builderConfigJson?: string | null;
}

/** App foreground colour so iframe text stays readable in light/dark themes. */
function appForegroundColor(): string {
  if (typeof window === "undefined") return "#1f2937";
  const v = getComputedStyle(document.documentElement).getPropertyValue("--foreground").trim();
  return v || "#1f2937";
}

function sampleFor(contentType: string, label: string): string {
  switch (contentType) {
    case "IMAGE":
      return '<span style="display:inline-block;width:96px;height:60px;border-radius:8px;background:#d1d5db;"></span>';
    case "AUDIO":
      return "🔊";
    case "VIDEO":
      return "🎬";
    case "TEXT":
    case "CLOZE":
    default:
      return label;
  }
}

function buildLabelMap(builderConfigJson: string | null | undefined, side: TemplateSide): Record<string, string> {
  const state = parseBuilderConfig(builderConfigJson);
  const map: Record<string, string> = {};
  if (state) {
    for (const block of state.sides[side] ?? []) {
      if (!block.enabled) continue;
      map[block.fieldName] = sampleFor(block.contentType, block.label || block.fieldName);
    }
  }
  return map;
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
    : `<div style="display:flex;align-items:center;justify-content:center;height:100vh;color:#9ca3af;font-size:13px;font-family:ui-sans-serif,system-ui,sans-serif;">Mẫu trống</div>`;
  return `<!doctype html><html><head><meta charset="utf-8"><style>
:root { color-scheme: light dark; }
html, body { margin: 0; height: 100%; background: transparent; color: ${appForegroundColor()}; }
.card { padding: 16px; }
${styling}
</style></head><body>${body}</body></html>`;
}

/** Build an iframe `srcdoc` previewing one side of a saved template. */
export function templatePreviewSrcDoc(tpl: PreviewableTemplate, side: TemplateSide): string {
  const tmpl = (side === "FRONT" ? tpl.frontTemplate : tpl.backTemplate) ?? "";
  const labelMap = buildLabelMap(tpl.builderConfigJson, side);
  // Fallback when there's no builder config: map each token to its own name.
  if (Object.keys(labelMap).length === 0 && tmpl) {
    const re = /\{\{\s*([^}]+?)\s*\}\}/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(tmpl))) labelMap[m[1].trim()] = m[1].trim();
  }
  return createIframeDoc(applyTemplate(tmpl, labelMap), tpl.styling ?? "");
}
