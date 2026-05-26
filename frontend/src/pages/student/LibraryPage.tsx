import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { deckApi, folderApi, tagApi } from "@/api";
import type { DeckDTO, FolderDTO, TagDTO } from "@/types";
import { MainLayout } from "@/components/layout/MainLayout";
import { cn } from "@/lib/utils";
import {
  BookOpen,
  ChevronDown,
  MoreHorizontal,
  Plus,
  Search,
  X,
} from "lucide-react";

/* ─────────────────────────────────────────
   Main page
───────────────────────────────────────── */
export default function LibraryPage() {
  const [folders, setFolders] = useState<FolderDTO[]>([]);
  const [decks, setDecks] = useState<DeckDTO[]>([]);
  const [tags, setTags] = useState<TagDTO[]>([]);

  const [selectedFolderId, setSelectedFolderId] = useState<number | null>(null);
  const [selectedTagId, setSelectedTagId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [openDeckMenu, setOpenDeckMenu] = useState<number | null>(null);

  const [newFolderOpen, setNewFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [newFolderDesc, setNewFolderDesc] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  /* ── Fetch ── */
  useEffect(() => {
    folderApi.getPage({ page: 0, size: 100 }).then((r) => setFolders(r.content ?? r.items ?? []));
    tagApi.getPage({ page: 0, size: 100 }).then((r) => setTags(r.content ?? r.items ?? []));
  }, []);

  useEffect(() => {
    setIsLoading(true);
    const filter = selectedFolderId != null ? { folderId: selectedFolderId } : {};
    deckApi
      .getPage({ page: 0, size: 100 }, searchQuery, filter as any)
      .then((r) => setDecks(r.content ?? r.items ?? []))
      .finally(() => setIsLoading(false));
  }, [selectedFolderId, searchQuery]);

  /* ── Derived ── */
  const relevantTags = useMemo(() => {
    const ids = new Set(decks.flatMap((d) => d.tagIds ?? []));
    return tags.filter((t) => t.id != null && ids.has(t.id));
  }, [decks, tags]);

  const filteredDecks = useMemo(() => {
    if (selectedTagId == null) return decks;
    return decks.filter((d) => d.tagIds?.includes(selectedTagId));
  }, [decks, selectedTagId]);

  /* ── Actions ── */
  const handleSelectFolder = (id: number | null) => {
    setSelectedFolderId(id);
    setSelectedTagId(null);
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    setIsSaving(true);
    try {
      await folderApi.create({ name: newFolderName.trim(), description: newFolderDesc.trim() || undefined });
      const r = await folderApi.getPage({ page: 0, size: 100 });
      setFolders(r.content ?? r.items ?? []);
      setNewFolderName("");
      setNewFolderDesc("");
      setNewFolderOpen(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteDeck = async (id: number) => {
    await deckApi.delete(String(id));
    setDecks((prev) => prev.filter((d) => d.id !== id));
    setOpenDeckMenu(null);
  };

  return (
    <MainLayout pathName={{ "/library": "Your Library" }}>
      <div className="flex flex-col -mx-6 -mt-6 flex-1 min-h-0 overflow-hidden">

        {/* ════════════════════════════════
            TOP · Folder tabs + New folder
        ════════════════════════════════ */}
        <div className="flex items-center gap-3 px-6 pt-5 pb-3 border-b border-border shrink-0">

          {/* Scrollable folder tabs */}
          <div className="flex items-center gap-2 flex-1 overflow-x-auto min-w-0 pb-0.5">
            {/* All tab */}
            <FolderTab
              label="All"
              active={selectedFolderId === null}
              onClick={() => handleSelectFolder(null)}
            />

            {folders.map((folder) => (
              <FolderTab
                key={folder.id}
                label={folder.name ?? "—"}
                active={selectedFolderId === folder.id}
                onClick={() => handleSelectFolder(folder.id!)}
              />
            ))}

            {/* Add tab shortcut */}
            <button
              onClick={() => setNewFolderOpen(true)}
              className="shrink-0 size-8 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-foreground/40 transition-colors"
              title="New folder"
            >
              <Plus className="size-3.5" />
            </button>
          </div>

          {/* ── New folder button (top-right) ── */}
          <button
            onClick={() => setNewFolderOpen(true)}
            className="shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <Plus className="size-4" />
            New folder
          </button>
        </div>

        {/* ════════════════════════════════
            FILTER · Tag pills + search
        ════════════════════════════════ */}
        <div className="flex items-center justify-between px-6 py-3 shrink-0">
          <div className="flex items-center gap-2 overflow-x-auto min-w-0">
            <button className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors shrink-0 select-none">
              Recent
              <ChevronDown className="size-3.5 mt-px" />
            </button>

            {relevantTags.length > 0 && (
              <>
                <div className="w-px h-4 bg-border mx-1 shrink-0" />
                {relevantTags.map((tag) => (
                  <TagChip
                    key={tag.id}
                    label={tag.name ?? ""}
                    color={tag.color}
                    active={selectedTagId === tag.id}
                    onClick={() => setSelectedTagId(selectedTagId === tag.id ? null : tag.id!)}
                  />
                ))}
              </>
            )}
          </div>

          {/* Search */}
          <div className="relative shrink-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search this folder"
              className="w-64 pl-9 pr-8 py-2 text-sm rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
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
                {searchQuery ? "No decks match your search" : "No decks in this folder"}
              </p>
            </div>
          ) : (
            <ul className="space-y-1 pb-28">
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
                      menuOpen={openDeckMenu === deck.id}
                      onMenuOpen={() => setOpenDeckMenu(deck.id!)}
                      onMenuClose={() => setOpenDeckMenu(null)}
                      onDelete={() => deck.id != null && handleDeleteDeck(deck.id)}
                    />
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>
          )}
        </div>

        {/* ════════════════════════════════
            BOTTOM · Action bar
        ════════════════════════════════ */}
        <div className="shrink-0 flex items-center justify-center gap-3 px-6 py-4 border-t border-border bg-background/90 backdrop-blur-sm">
          <button className="px-8 py-2.5 rounded-full text-sm font-semibold bg-secondary text-secondary-foreground hover:bg-secondary/70 transition-colors">
            Study
          </button>
          <button className="px-8 py-2.5 rounded-full text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors flex items-center gap-1.5">
            <Plus className="size-4" />
            Add sets
          </button>
        </div>
      </div>

      {/* ════════════════════════════════
          MODAL · New folder
      ════════════════════════════════ */}
      <AnimatePresence>
        {newFolderOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setNewFolderOpen(false)}
            />

            {/* Dialog */}
            <motion.div
              className="fixed z-50 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm"
              initial={{ opacity: 0, scale: 0.95, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 8 }}
              transition={{ duration: 0.18 }}
            >
              <div className="rounded-2xl border border-border bg-card shadow-xl p-6 space-y-4">
                {/* Header */}
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-semibold text-foreground">Create new folder</h2>
                  <button
                    onClick={() => setNewFolderOpen(false)}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <X className="size-4" />
                  </button>
                </div>

                {/* Fields */}
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-foreground">Folder name</label>
                    <input
                      autoFocus
                      value={newFolderName}
                      onChange={(e) => setNewFolderName(e.target.value)}
                      placeholder="e.g. Exam 1"
                      className="w-full text-sm rounded-lg border border-input bg-background px-3 py-2 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                      onKeyDown={(e) => e.key === "Enter" && handleCreateFolder()}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-foreground">
                      Description
                      <span className="ml-1 text-muted-foreground font-normal">(optional)</span>
                    </label>
                    <input
                      value={newFolderDesc}
                      onChange={(e) => setNewFolderDesc(e.target.value)}
                      placeholder="What's this folder for?"
                      className="w-full text-sm rounded-lg border border-input bg-background px-3 py-2 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                    />
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => setNewFolderOpen(false)}
                    className="flex-1 py-2 text-sm rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateFolder}
                    disabled={!newFolderName.trim() || isSaving}
                    className="flex-1 py-2 text-sm font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
                  >
                    {isSaving ? "Creating…" : "Create"}
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
   Sub-components
───────────────────────────────────────── */

function FolderTab({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "shrink-0 px-4 py-1.5 rounded-full text-sm font-medium border transition-colors whitespace-nowrap",
        active
          ? "bg-primary text-primary-foreground border-primary"
          : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/30 bg-transparent"
      )}
    >
      {label}
    </button>
  );
}

function TagChip({
  label,
  color,
  active,
  onClick,
}: {
  label: string;
  color?: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "shrink-0 flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border transition-colors",
        active
          ? "bg-primary text-primary-foreground border-primary"
          : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/30 bg-transparent"
      )}
    >
      {color && (
        <span className="size-1.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
      )}
      {label}
    </button>
  );
}

function DeckRow({
  deck,
  menuOpen,
  onMenuOpen,
  onMenuClose,
  onDelete,
}: {
  deck: DeckDTO;
  menuOpen: boolean;
  onMenuOpen: () => void;
  onMenuClose: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="relative flex items-center gap-4 px-4 py-3.5 rounded-xl hover:bg-accent group transition-colors cursor-pointer">
      {/* Icon */}
      <div className="shrink-0 size-10 rounded-lg bg-gradient-to-br from-chart-1 to-chart-2 flex items-center justify-center shadow-sm">
        <BookOpen className="size-4 text-white" />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground truncate">
          {deck.title ?? "Untitled"}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">
          Flashcard set &middot; {deck.totalCards ?? 0} terms
        </p>
      </div>

      {/* Overflow menu */}
      <div className="relative shrink-0">
        <button
          onClick={(e) => {
            e.stopPropagation();
            menuOpen ? onMenuClose() : onMenuOpen();
          }}
          className={cn(
            "p-1.5 rounded-md transition-colors text-muted-foreground hover:text-foreground hover:bg-background",
            menuOpen ? "opacity-100" : "opacity-0 group-hover:opacity-100"
          )}
        >
          <MoreHorizontal className="size-4" />
        </button>

        {menuOpen && (
          <>
            <div className="fixed inset-0 z-10" onClick={onMenuClose} />
            <div className="absolute right-0 top-9 z-20 w-36 rounded-xl border border-border bg-popover shadow-lg py-1 text-sm text-popover-foreground">
              <button className="w-full px-3 py-2 text-left hover:bg-accent hover:text-accent-foreground transition-colors rounded-sm">
                View
              </button>
              <button className="w-full px-3 py-2 text-left hover:bg-accent hover:text-accent-foreground transition-colors rounded-sm">
                Edit
              </button>
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
