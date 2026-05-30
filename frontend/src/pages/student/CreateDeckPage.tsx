import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import { MainLayout } from "@/components/layout/MainLayout";
import { cn } from "@/lib/utils";
import {
  ArrowRight,
  BookOpen,
  Brain,
  CheckCircle2,
  Clock,
  Layers,
  Mic,
  RotateCcw,
  Sparkles,
  Star,
  Zap,
} from "lucide-react";

const MODES = [
  {
    id: "quizlet",
    path: "/create-deck/quizlet",
    colorClass: {
      bg:      "bg-amber-500",
      bgLight: "bg-amber-50 dark:bg-amber-950/30",
      border:  "border-amber-400 dark:border-amber-500",
      text:    "text-amber-600 dark:text-amber-400",
      iconBg:  "bg-amber-500/12 text-amber-600 dark:text-amber-400",
      badge:   "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400",
      btn:     "bg-amber-500 hover:bg-amber-600 text-white",
      glow:    "shadow-amber-100 dark:shadow-amber-900/20",
    },
    icon: Sparkles,
    label: "Quizlet",
    tagline: "Luyện tập nhanh",
    badge: "Phổ biến",
    description: "Tạo thẻ lật truyền thống — mặt trước, mặt sau và ảnh tuỳ chọn. Lý tưởng để học từ vựng hay ôn tập nhanh.",
    features: [
      { icon: Zap,       text: "Tạo thẻ siêu nhanh" },
      { icon: BookOpen,  text: "Mặt trước · mặt sau · ảnh" },
      { icon: RotateCcw, text: "Lật thẻ, đánh dấu đúng / sai" },
    ],
    bestFor: ["Từ vựng ngôn ngữ", "Ôn thi nhanh", "Khái niệm đơn giản"],
  },
  {
    id: "anki",
    path: "/create-deck/anki",
    colorClass: {
      bg:      "bg-violet-600",
      bgLight: "bg-violet-50 dark:bg-violet-950/30",
      border:  "border-violet-400 dark:border-violet-500",
      text:    "text-violet-600 dark:text-violet-400",
      iconBg:  "bg-violet-500/12 text-violet-600 dark:text-violet-400",
      badge:   "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-400",
      btn:     "bg-violet-600 hover:bg-violet-700 text-white",
      glow:    "shadow-violet-100 dark:shadow-violet-900/20",
    },
    icon: Brain,
    label: "Anki",
    tagline: "Lặp lại ngắt quãng",
    badge: "Học sâu",
    description: "Thẻ đa phương tiện với lịch ôn tập thông minh SM-2. Phù hợp để học dài hạn và ghi nhớ bền vững.",
    features: [
      { icon: Mic,    text: "Văn bản · ảnh · audio · cloze" },
      { icon: Layers, text: "Gợi ý và giải thích chi tiết" },
      { icon: Clock,  text: "Lịch ôn SM-2 tự động" },
    ],
    bestFor: ["Tiếng Nhật / Hán", "Y khoa", "Ghi nhớ dài hạn"],
  },
] as const;

export default function CreateDeckPage() {
  const navigate = useNavigate();
  const [hovered, setHovered] = useState<string | null>(null);

  return (
    <MainLayout>
      {/* Fill the entire available content area without scrolling */}
      <div className="flex-1 min-h-0 flex flex-col w-full">

        {/* ── Header — compact ── */}
        <motion.div
          className="shrink-0 text-center pt-4 pb-5"
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28 }}
        >
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/8 border border-primary/20 text-primary text-[11px] font-semibold mb-3">
            <Sparkles className="size-3" />
            Tạo bộ thẻ mới
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            Chọn phương thức học
          </h1>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
            Mỗi deck gắn với một chế độ cố định — chọn cái phù hợp với mục tiêu của bạn.
          </p>
        </motion.div>

        {/* ── Cards — flex-1 to fill remaining height ── */}
        <div className="flex-1 min-h-0 grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
          {MODES.map((mode, i) => {
            const Icon = mode.icon;
            const isHovered = hovered === mode.id;

            return (
              <motion.button
                key={mode.id}
                onClick={() => navigate(mode.path)}
                onHoverStart={() => setHovered(mode.id)}
                onHoverEnd={() => setHovered(null)}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.28, delay: i * 0.07 }}
                whileHover={{ y: -3 }}
                whileTap={{ scale: 0.99 }}
                className={cn(
                  "group relative flex flex-col text-left rounded-xl border-2 bg-card transition-all duration-200 overflow-hidden min-h-0",
                  isHovered
                    ? `${mode.colorClass.border} shadow-lg ${mode.colorClass.glow}`
                    : "border-border shadow-sm"
                )}
              >
                {/* Top color stripe */}
                <div className={cn("h-1 w-full shrink-0", mode.colorClass.bg)} />

                {/* Card content — fills remaining height */}
                <div className="flex flex-col flex-1 min-h-0 p-4 sm:p-5 gap-4">

                  {/* Icon + badge */}
                  <div className="flex items-center justify-between shrink-0">
                    <div className={cn(
                      "size-10 rounded-lg flex items-center justify-center transition-transform duration-200 group-hover:scale-105",
                      mode.colorClass.iconBg
                    )}>
                      <Icon className="size-4.5" />
                    </div>
                    <span className={cn(
                      "text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full",
                      mode.colorClass.badge
                    )}>
                      {mode.badge}
                    </span>
                  </div>

                  {/* Title + tagline + description */}
                  <div className="shrink-0 space-y-1">
                    <h2 className="text-base sm:text-lg font-bold text-foreground leading-tight">
                      {mode.label}
                    </h2>
                    <p className={cn("text-[11px] font-semibold", mode.colorClass.text)}>
                      {mode.tagline}
                    </p>
                    <p className="text-xs text-muted-foreground leading-relaxed pt-0.5">
                      {mode.description}
                    </p>
                  </div>

                  {/* Features */}
                  <ul className="shrink-0 space-y-1.5">
                    {mode.features.map((f, j) => {
                      const FIcon = f.icon;
                      return (
                        <li key={j} className="flex items-center gap-2 text-xs text-foreground/80">
                          <FIcon className={cn("size-3.5 shrink-0", mode.colorClass.text)} />
                          {f.text}
                        </li>
                      );
                    })}
                  </ul>

                  {/* Best for — fills remaining space */}
                  <div className={cn(
                    "flex-1 min-h-0 rounded-lg px-3 py-2.5 flex flex-col gap-2",
                    mode.colorClass.bgLight
                  )}>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground shrink-0">
                      Phù hợp nhất
                    </p>
                    <div className="flex flex-col gap-1.5">
                      {mode.bestFor.map((item, k) => (
                        <span key={k} className="inline-flex items-center gap-1.5 text-xs text-foreground/70">
                          <CheckCircle2 className={cn("size-3 shrink-0", mode.colorClass.text)} />
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* CTA */}
                  <div className={cn(
                    "shrink-0 flex items-center justify-center gap-2 w-full py-2 rounded-lg text-sm font-semibold transition-all duration-150 shadow-sm",
                    mode.colorClass.btn
                  )}>
                    Tạo {mode.label} deck
                    <ArrowRight className="size-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>
              </motion.button>
            );
          })}
        </div>

        {/* ── Footer note ── */}
        <motion.p
          className="shrink-0 text-center text-[11px] text-muted-foreground pt-3 pb-2 flex items-center justify-center gap-1.5"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <Star className="size-3 text-amber-400 fill-amber-400 shrink-0" />
          Chế độ học không thể thay đổi sau khi tạo — hãy chọn cẩn thận!
        </motion.p>
      </div>
    </MainLayout>
  );
}
