import { useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import { MainLayout } from "@/components/layout/MainLayout";
import { cn } from "@/lib/utils";
import {
  ArrowRight,
  BookOpen,
  Brain,
  ChevronLeft,
  Image as ImageIcon,
  Mic,
  ScrollText,
  Sparkles,
  Zap,
} from "lucide-react";

export default function CreateDeckPage() {
  const navigate = useNavigate();

  return (
    <MainLayout pathName={{ "/create-deck": "Create deck" }}>
      <div className="h-full flex flex-col w-full">

        {/* ── narrow centered column ── */}
        <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
          <div className="w-full max-w-3xl">

            {/* Back */}
            <button
              onClick={() => navigate("/library")}
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
            >
              <ChevronLeft className="size-4" />
              Back to library
            </button>

            {/* Heading */}
            <div className="text-center mb-10">
              <h1 className="text-3xl font-bold tracking-tight text-foreground">
                Pick a study style
              </h1>
              <p className="text-sm text-muted-foreground mt-2">
                Each deck is locked to the mode you choose — pick what fits your goals.
              </p>
            </div>

            {/* Cards side by side */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

              {/* ── Quizlet ── */}
              <ModeCard
                accentFrom="from-amber-400"
                accentTo="to-orange-500"
                icon={<Sparkles className="size-6" />}
                title="Quizlet"
                tagline="Fast & casual"
                description="Classic flip-card study. One front, one back, optional image per card."
                features={[
                  { icon: <Zap className="size-3.5" />, text: "Instant to create" },
                  { icon: <BookOpen className="size-3.5" />, text: "Front · back · image" },
                  { icon: <ImageIcon className="size-3.5" />, text: "No scheduling overhead" },
                ]}
                cta="Create Quizlet deck"
                onClick={() => navigate("/create-deck/quizlet")}
              />

              {/* ── Anki ── */}
              <ModeCard
                accentFrom="from-violet-500"
                accentTo="to-indigo-600"
                icon={<Brain className="size-6" />}
                title="Anki"
                tagline="Smart spaced repetition"
                description="Rich multi-block cards (text, image, audio, cloze) with hint & explanation, scheduled by SM2."
                features={[
                  { icon: <Mic className="size-3.5" />, text: "Text / image / audio / cloze" },
                  { icon: <ScrollText className="size-3.5" />, text: "Hint + explanation" },
                  { icon: <Brain className="size-3.5" />, text: "SM2 review scheduling" },
                ]}
                cta="Create Anki deck"
                onClick={() => navigate("/create-deck/anki")}
              />

            </div>
          </div>
        </div>

      </div>
    </MainLayout>
  );
}

/* ─────────────────────────────────────────
   Mode card
───────────────────────────────────────── */
function ModeCard({
  accentFrom,
  accentTo,
  icon,
  title,
  tagline,
  description,
  features,
  cta,
  onClick,
}: {
  accentFrom: string;
  accentTo: string;
  icon: React.ReactNode;
  title: string;
  tagline: string;
  description: string;
  features: { icon: React.ReactNode; text: string }[];
  cta: string;
  onClick: () => void;
}) {
  const gradient = `${accentFrom} ${accentTo}`;

  return (
    <motion.button
      onClick={onClick}
      whileHover={{ y: -4, scale: 1.01 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", stiffness: 350, damping: 28 }}
      className="group relative flex flex-col text-left rounded-2xl border border-border bg-card shadow-sm hover:shadow-lg hover:border-transparent overflow-hidden transition-shadow duration-200"
    >
      {/* Gradient header area */}
      <div className={cn("relative bg-gradient-to-br p-6 pb-8", gradient)}>
        {/* Decorative blurred circle */}
        <div className="absolute -right-6 -top-6 size-28 rounded-full bg-white/10 blur-2xl pointer-events-none" />

        <div className={cn(
          "size-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-white shadow-sm mb-4"
        )}>
          {icon}
        </div>

        <p className="text-xl font-bold text-white leading-tight">{title}</p>
        <p className="text-xs text-white/70 mt-0.5 font-medium">{tagline}</p>
      </div>

      {/* Body */}
      <div className="flex flex-col flex-1 p-5 space-y-4">
        <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>

        <ul className="space-y-2.5 flex-1">
          {features.map((f, i) => (
            <li key={i} className="flex items-center gap-2.5 text-xs text-foreground">
              <span className={cn(
                "size-6 rounded-lg bg-gradient-to-br flex items-center justify-center text-white shrink-0",
                gradient
              )}>
                {f.icon}
              </span>
              {f.text}
            </li>
          ))}
        </ul>

        {/* CTA */}
        <div className={cn(
          "flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r shadow-sm mt-2 group-hover:opacity-90 transition-opacity",
          gradient
        )}>
          {cta}
          <ArrowRight className="size-3.5 group-hover:translate-x-0.5 transition-transform" />
        </div>
      </div>
    </motion.button>
  );
}
