import type { FlashcardContentType, FlashcardSideType } from "@/types";

export type TemplateSide = Extract<FlashcardSideType, "FRONT" | "BACK">;

/**
 * One row in the visual builder. Maps 1:1 to a {{fieldName}} token in the generated
 * template. We keep the field name + content type so the UI can show the right icon
 * and label without inventing abstract block types.
 */
export interface CardTemplateBlock {
  id: string;
  side: TemplateSide;
  fieldName: string;
  contentType: FlashcardContentType;
  label: string;
  enabled: boolean;
  size: "primary" | "secondary" | "caption";
  showLabel: boolean;
}

export type TemplateLayoutMode =
  | "CENTER"
  | "LEFT"
  | "RIGHT"
  | "TWO_COLUMNS"
  | "IMAGE_TOP"
  | "IMAGE_LEFT"
  | "IMAGE_RIGHT"
  | "COMPACT"
  | "FOCUS"
  | "STACKED";

export type TemplateTheme =
  | "MINIMAL"
  | "ZEN"
  | "MODERN"
  | "ACADEMIC"
  | "DARK"
  | "JLPT"
  | "CUSTOM";

export type FuriganaMode = "SHOW" | "HIDE" | "HOVER" | "TOGGLE";

export type FontFamilyKey =
  | "SANS"
  | "SERIF"
  | "ROUNDED"
  | "MONO"
  | "JP_GOTHIC"
  | "JP_MINCHO";

export interface AvailableTemplateField {
  name: string;
  side: TemplateSide;
  contentType: FlashcardContentType;
  /** Original label (from the card's content.label) or synthetic Field1/2 */
  label: string;
  preview: string;
}

export interface LayoutSettings {
  mode: TemplateLayoutMode;
  spacing: "comfortable" | "compact" | "roomy";
}

export interface TypographySettings {
  fontFamily: FontFamilyKey;
  fontSize: number;
  fontWeight: number;
  lineHeight: number;
  letterSpacing: number;
  italic: boolean;
  underline: boolean;
  uppercase: boolean;
  /** null = inherit theme text color */
  textColor: string | null;
}

export interface JapaneseLearningSettings {
  furiganaMode: FuriganaMode;
}

export interface MediaSettings {
  autoPlayAudio: boolean;
  showAudioButton: boolean;
  showImage: boolean;
  showVideo: boolean;
}

export interface CustomColors {
  bg: string;
  text: string;
  accent: string;
  border: string;
}

export interface CardTemplateSettings {
  layout: LayoutSettings;
  typography: TypographySettings;
  japanese: JapaneseLearningSettings;
  media: MediaSettings;
  theme: TemplateTheme;
  /** Used when theme === "CUSTOM" */
  customColors: CustomColors;
}

export interface CardTemplateBuilderState {
  version: 2;
  sides: Record<TemplateSide, CardTemplateBlock[]>;
  settings: CardTemplateSettings;
}

export interface GeneratedTemplateDraft {
  frontTemplate: string;
  backTemplate: string;
  styling: string;
}
