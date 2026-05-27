import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "motion/react";
import { deckApi, tagApi } from "@/api";
import type { DeckDTO, TagDTO } from "@/types";
import { MainLayout } from "@/components/layout/MainLayout";
import { cn } from "@/lib/utils";
import { BookOpen, Check, MoreHorizontal, Plus, Search, Tag, X } from "lucide-react";
import { getCurrentUserId } from "@/utils/auth.utils";

/* ─────────────────────────────────────────
   Main page
───────────────────────────────────────── */
export default function LibraryPage() {
  const [decks, setDecks] = useState<DeckDTO[]>([]);
  const [tags, setTags] = useState<TagDTO[]>([]);
  const [selectedTagId, setSelectedTagId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [openDeckMenu, setOpenDeckMenu] = useState<number | null>(null);

  /* ── New tag modal ── */
  const [newTagOpen, setNewTagOpen] = useState(false);
  const [newTagName, setNewTagName] = useState("");
  const [newTagColor, setNewTagColor] = useState("#6366f1");
  const [isSavingTag, setIsSavingTag] = useState(false);

  /* ── Fetch ── */
  useEffect(() => {
    tagApi.getPage({ page: 0, size: 100 }).then((r) => setTags(r.content ?? (r as any).items ?? []));
  }, []);

  useEffect(() => {
    setIsLoading(true);
    deckApi
      .getPage({ page: 0, size: 100 }, searchQuery)
      .then((r) => setDecks(r.content ?? (r as any).items ?? []))
      .finally(() => setIsLoading(false));
  }, [searchQuery]);

  /* ── Derived ── */
  const filteredDecks = useMemo(() => {
    if (selectedTagId == null) return decks;
    return decks.filter((d) => d.tagIds?.includes(selectedTagId));
  }, [decks, selectedTagId]);

  /* ── Actions ── */
  const handleCreateTag = async () => {
    if (!newTagName.trim()) return;
    setIsSavingTag(true);
    try {
      const userId = getCurrentUserId();
      await tagApi.create({ name: newTagName.trim(), color: newTagColor, userId, isActive: true } as any);
      const r = await tagApi.getPage({ page: 0, size: 100 });
      setTags(r.content ?? (r as any).items ?? []);
      setNewTagName("");
      setNewTagColor("#6366f1");
      setNewTagOpen(false);
    } finally {
      setIsSavingTag(false);
    }
  };

  const handleDeleteDeck = async (id: number) => {
    await deckApi.delete(String(id));
    setDecks((prev) => prev.filter((d) => d.id !== id));
    setOpenDeckMenu(null);
  };

  const handleTagToggle = async (deck: DeckDTO, tagId: number) => {
    const current = new Set<number>(deck.tagIds ?? []);
    if (current.has(tagId)) current.delete(tagId);
    else current.add(tagId);
    const updated = { ...deck, tagIds: Array.from(current) };
    await deckApi.update(String(deck.id), updated as any);
    setDecks((prev) => prev.map((d) => (d.id === deck.id ? { ...d, tagIds: Array.from(current) } : d)));
  };

  return (
    <MainLayout pathName={{ "/library": "Your Library" }}>
      <div className="flex flex-col -mx-6 -mt-6 flex-1 min-h-0 overflow-hidden">

        {/* ════════════════════════════════
            TOP · Tag tabs
        ════════════════════════════════ */}
        <div className="flex items-center gap-3 px-6 pt-5 pb-3 border-b border-border shrink-0">

          {/* Scrollable tag tabs */}
          <div className="flex items-center gap-2 flex-1 overflow-x-auto min-w-0 pb-0.5">
            <TagTab label="All" color={undefined} active={selectedTagId === null} onClick={() => setSelectedTagId(null)} />

            {tags.map((tag) => (
              <TagTab
                key={tag.id}
                label={tag.name ?? "—"}
                color={tag.color}
                active={selectedTagId === tag.id}
                onClick={() => setSelectedTagId(selectedTagId === tag.id ? null : tag.id!)}
              />
            ))}

            <button
              onClick={() => setNewTagOpen(true)}
              className="shrink-0 size-8 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-foreground/40 transition-colors"
              title="New tag"
            >
              <Plus className="size-3.5" />
            </button>
          </div>

          {/* Create tag button */}
          <button
            onClick={() => setNewTagOpen(true)}
            className="shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <Tag className="size-3.5" />
            New tag
          </button>
        </div>

        {/* ════════════════════════════════
            SEARCH BAR
        ════════════════════════════════ */}
        <div className="flex items-center justify-between px-6 py-3 shrink-0">
          <p className="text-sm text-muted-foreground">
            {filteredDecks.length} {filteredDecks.length === 1 ? "deck" : "decks"}
            {selectedTagId != null && (
              <span className="ml-1">
                in <span className="font-medium text-foreground">{tags.find((t) => t.id === selectedTagId)?.name}</span>
              </span>
            )}
          </p>

          <div className="relative shrink-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search decks…"
              className="w-60 pl-9 pr-8 py-2 text-sm rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* ════════════════════════════════
            DECK LIST
        ════════════════════════════════ */}
        <div className="flex-1 overflow-y-auto px-6 min-h-0">
          {isLoading ? (
            <div className="flex items-center justify-center h-40">
              <div className="size-5 border-2 border-border border-t-foreground rounded-full animate-spin" />
            </div>
          ) : filteredDecks.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 gap-2">
              <BookOpen className="size-8 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">
                {searchQuery ? "No decks match your search" : selectedTagId != null ? "No decks in this tag" : "No decks yet"}
              </p>
            </div>
          ) : (
            <ul className="space-y-1 pb-24">
              <AnimatePresence initial={false}>
                {filteredDecks.map((deck, i) => (
                  <motion.li
                    key={deck.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15, delay: i * 0.025 }}
                  >
                    <DeckRow
                      deck={deck}
                      allTags={tags}
                      menuOpen={openDeckMenu === deck.id}
                      onMenuOpen={() => setOpenDeckMenu(deck.id!)}
                      onMenuClose={() => setOpenDeckMenu(null)}
                      onDelete={() => deck.id != null && handleDeleteDeck(deck.id)}
                      onTagToggle={(tagId) => handleTagToggle(deck, tagId)}
                    />
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>
          )}
        </div>
      </div>

      {/* ════════════════════════════════
          MODAL · New tag
      ════════════════════════════════ */}
      <AnimatePresence>
        {newTagOpen && (
          <>
            <motion.div
              className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setNewTagOpen(false)}
            />
            <motion.div
              className="fixed z-50 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm"
              initial={{ opacity: 0, scale: 0.95, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 8 }}
              transition={{ duration: 0.18 }}
            >
              <div className="rounded-2xl border border-border bg-card shadow-xl p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-semibold text-foreground">Create new tag</h2>
                  <button onClick={() => setNewTagOpen(false)} className="text-muted-foreground hover:text-foreground">
                    <X className="size-4" />
                  </button>
                </div>

                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-foreground">Tag name</label>
                    <input
                      autoFocus
                      value={newTagName}
                      onChange={(e) => setNewTagName(e.target.value)}
                      placeholder="e.g. Grammar"
                      className="w-full text-sm rounded-lg border border-input bg-background px-3 py-2 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                      onKeyDown={(e) => e.key === "Enter" && handleCreateTag()}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-foreground">Color</label>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={newTagColor}
                        onChange={(e) => setNewTagColor(e.target.value)}
                        className="size-9 rounded-lg border border-input cursor-pointer bg-background"
                      />
                      <span className="text-sm text-muted-foreground font-mono">{newTagColor}</span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => setNewTagOpen(false)}
                    className="flex-1 py-2 text-sm rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateTag}
                    disabled={!newTagName.trim() || isSavingTag}
                    className="flex-1 py-2 text-sm font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
                  >
                    {isSavingTag ? "Creating…" : "Create"}
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </MainLayout>
  );
}

/* ─────────────────────────────────────────
   Tag tab
───────────────────────────────────────── */
function TagTab({ label, color, active, onClick }: {
  label: string;
  color?: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "shrink-0 flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium border transition-colors whitespace-nowrap",
        active
          ? "bg-primary text-primary-foreground border-primary"
          : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/30 bg-transparent"
      )}
    >
      {color && (
        <span className="size-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
      )}
      {label}
    </button>
  );
}

/* ─────────────────────────────────────────
   Deck row
───────────────────────────────────────── */
function DeckRow({
  deck,
  allTags,
  menuOpen,
  onMenuOpen,
  onMenuClose,
  onDelete,
  onTagToggle,
}: {
  deck: DeckDTO;
  allTags: TagDTO[];
  menuOpen: boolean;
  onMenuOpen: () => void;
  onMenuClose: () => void;
  onDelete: () => void;
  onTagToggle: (tagId: number) => void;
}) {
  const navigate = useNavigate();
  const [tagPickerOpen, setTagPickerOpen] = useState(false);

  const deckTagIds = new Set<number>(deck.tagIds ?? []);

  return (
    <div
      className="relative flex items-center gap-4 px-4 py-3.5 rounded-xl hover:bg-accent group transition-colors cursor-pointer"
      onClick={() => navigate(`/deck/${deck.id}`)}
    >
      {/* Icon */}
      <div className="shrink-0 size-10 rounded-lg bg-gradient-to-br from-chart-1 to-chart-2 flex items-center justify-center shadow-sm">
        <BookOpen className="size-4 text-white" />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground truncate">{deck.title ?? "Untitled"}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <p className="text-xs text-muted-foreground">
            {deck.totalCards ?? 0} terms
          </p>
          {/* Tag dots on the row */}
          {allTags.filter((t) => t.id != null && deckTagIds.has(t.id!)).map((t) => (
            <span
              key={t.id}
              className="inline-flex items-center gap-1 text-[10px] font-medium text-muted-foreground"
            >
              <span className="size-1.5 rounded-full shrink-0" style={{ backgroundColor: t.color ?? "#888" }} />
              {t.name}
            </span>
          ))}
        </div>
      </div>

      {/* Overflow menu */}
      <div className="relative shrink-0" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={() => { menuOpen ? onMenuClose() : onMenuOpen(); setTagPickerOpen(false); }}
          className={cn(
            "p-1.5 rounded-md transition-colors text-muted-foreground hover:text-foreground hover:bg-background",
            menuOpen ? "opacity-100" : "opacity-0 group-hover:opacity-100"
          )}
        >
          <MoreHorizontal className="size-4" />
        </button>

        {menuOpen && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => { onMenuClose(); setTagPickerOpen(false); }} />
            <div className="absolute right-0 top-9 z-20 w-44 rounded-xl border border-border bg-popover shadow-lg py-1 text-sm text-popover-foreground">

              {/* Add to tag — with nested picker */}
              <div className="relative">
                <button
                  onClick={() => setTagPickerOpen((o) => !o)}
                  className="w-full px-3 py-2 text-left hover:bg-accent hover:text-accent-foreground transition-colors rounded-sm flex items-center justify-between"
                >
                  <span className="flex items-center gap-2">
                    <Tag className="size-3.5 text-muted-foreground" />
                    Add to tag
                  </span>
                  <Plus className="size-3 text-muted-foreground" />
                </button>

                <AnimatePresence>
                  {tagPickerOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ duration: 0.12 }}
                      className="absolute right-full top-0 mr-1 w-44 rounded-xl border border-border bg-popover shadow-lg py-1 z-30"
                    >
                      {allTags.length === 0 ? (
                        <p className="px-3 py-2 text-xs text-muted-foreground">No tags yet</p>
                      ) : (
                        allTags.map((tag) => (
                          <button
                            key={tag.id}
                            onClick={() => { onTagToggle(tag.id!); }}
                            className="w-full px-3 py-2 text-left text-sm hover:bg-accent transition-colors flex items-center gap-2"
                          >
                            <span
                              className="size-2.5 rounded-full shrink-0"
                              style={{ backgroundColor: tag.color ?? "#888" }}
                            />
                            <span className="flex-1 truncate">{tag.name}</span>
                            {deckTagIds.has(tag.id!) && (
                              <Check className="size-3.5 text-primary shrink-0" />
                            )}
                          </button>
                        ))
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="my-1 border-t border-border" />
              <button
                onClick={onDelete}
                className="w-full px-3 py-2 text-left text-destructive hover:bg-accent transition-colors rounded-sm"
              >
                Remove
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
