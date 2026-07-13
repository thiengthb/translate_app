import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  BookText,
  ChevronDown,
  Layers,
  Library,
  ScrollText,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

const CONTENT_ITEMS = [
  { label: "Decks", desc: "Bộ Hán tự để học", icon: Layers, to: "/kanji-study/decks" },
  { label: "Bộ Thủ", desc: "214 bộ thủ Kanji", icon: Library, to: "/kanji-study/radicals" },
  { label: "Bài đọc", desc: "Luyện đọc theo cấp độ", icon: ScrollText, to: "/kanji-study/reading" },
];

/**
 * In-page sub-nav for the Kanji-study area, rendered in the shared shell's
 * top bar (via {@link KanjiLayout}'s `headerExtra`).
 *
 * The Hanabun sidebar now handles global navigation + the exit-to-home, so
 * this is just the feature-local nav: a home link plus the Content dropdown
 * to the Kanji sub-pages (Decks / Bộ Thủ / Bài đọc) — which aren't in the
 * sidebar catalog, so they need this quick entry point.
 */
export function KanjiContentNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const isHome = location.pathname === "/kanji-study";

  return (
    <nav className="flex items-center gap-1">
      <span className="mr-1 hidden items-center gap-1.5 sm:flex">
        <span className="grid h-6 w-6 place-items-center rounded-md bg-rose-500 font-serif text-sm text-white">
          漢
        </span>
        <span className="text-sm font-bold text-foreground">Kanji Study</span>
      </span>

      <Link
        to="/kanji-study"
        className={cn(
          "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
          isHome
            ? "text-rose-500"
            : "text-muted-foreground hover:bg-muted hover:text-foreground",
        )}
      >
        Trang chủ
      </Link>

      <DropdownMenu>
        <DropdownMenuTrigger className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-medium text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground">
          <BookText size={15} />
          Content
          <ChevronDown size={14} className="opacity-70" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-64 p-2">
          {CONTENT_ITEMS.map((item) => (
            <DropdownMenuItem
              key={item.to}
              onClick={() => navigate(item.to)}
              className="gap-3 p-2.5 rounded-lg cursor-pointer"
            >
              <span className="grid place-items-center h-9 w-9 shrink-0 rounded-lg bg-muted text-rose-500">
                <item.icon size={18} />
              </span>
              <span className="flex flex-col">
                <span className="text-sm font-medium text-foreground">{item.label}</span>
                <span className="text-xs text-muted-foreground">{item.desc}</span>
              </span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </nav>
  );
}
