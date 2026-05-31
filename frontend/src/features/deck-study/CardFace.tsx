import type { FlashcardDTO } from "@/types";
import { cn } from "@/lib/utils";
import { getSideAudio, getSideImages, getSideTextBlocks, getSideVideos } from "./cardContent";
import type { StudySide } from "./types";

interface CardFaceProps {
  flashcard: FlashcardDTO;
  side: StudySide;
  /** Larger typography + media for full-view / focus layouts. */
  large?: boolean;
  className?: string;
}

/**
 * Plain (non-template) renderer for one side of a card: text blocks + images +
 * audio + video, centered. Shared by Flashcard / Learn / Write / Quiz so every
 * mode renders identical card content. (SRS uses TemplateCardFace instead.)
 */
export function CardFace({ flashcard, side, large = false, className }: CardFaceProps) {
  const texts = getSideTextBlocks(flashcard, side);
  const images = getSideImages(flashcard, side);
  const audios = getSideAudio(flashcard, side);
  const videos = getSideVideos(flashcard, side);

  return (
    <div className={cn("flex w-full flex-col items-center gap-2", className)}>
      <div className="flex w-full flex-col items-center gap-1.5">
        {texts.map((text, i) => (
          <p
            key={i}
            className={cn(
              "w-full text-center font-bold leading-snug text-foreground",
              i === 0
                ? large
                  ? "text-4xl sm:text-5xl"
                  : "text-2xl"
                : large
                  ? "text-xl text-foreground/80"
                  : "text-base text-foreground/80"
            )}
          >
            {text}
          </p>
        ))}
      </div>

      {images.map((url, i) => (
        <img
          key={`img-${i}`}
          src={url}
          alt=""
          className={cn(
            "mt-1 rounded-xl border border-border object-contain",
            large ? "max-h-64" : "max-h-24"
          )}
        />
      ))}

      {videos.map((url, i) => (
        <video
          key={`vid-${i}`}
          src={url}
          controls
          className={cn("mt-1 rounded-xl border border-border", large ? "max-h-72" : "max-h-28")}
        />
      ))}

      {audios.map((url, i) => (
        <audio key={`aud-${i}`} src={url} controls className="mt-1 h-8 w-full max-w-xs" />
      ))}
    </div>
  );
}
