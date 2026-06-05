import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { assessmentApi, classroomApi, deckApi } from "@/api";
import { fileApi } from "@/api/features/file.api";
import type { ClassAssignmentDTO, DeckDTO } from "@/types";
import { useClassroom } from "@/hooks/useClassroom";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  BarChart3, BookOpen, CalendarClock, Check, ChevronRight, ClipboardList, Copy,
  Eye, GraduationCap, Image as ImageIcon, LayoutGrid, List, Loader2, Play, Plus, RefreshCw,
  Trash2, Users, UserMinus, X,
} from "lucide-react";
import { COLOR_PRESETS } from "@/lib/color-presets";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { getCurrentUserId } from "@/utils/auth.utils";
import { CreateEditAssignmentModal } from "./CreateEditAssignmentModal";
import { formatDateTime } from "@/pages/assessment/_shared";

type AssignmentView = "list" | "card";
const ASSIGNMENT_VIEW_KEY = "classroomAssignmentView";

const STATUS_STYLE: Record<string, { badge: string; border: string }> = {
  DRAFT:     { badge: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300", border: "border-l-slate-400" },
  PUBLISHED: { badge: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400", border: "border-l-green-500" },
  CLOSED:    { badge: "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400", border: "border-l-zinc-400" },
};

export default function ClassroomDetailPage() {
  const { classroomId } = useParams<{ classroomId: string }>();
  const cid = Number(classroomId);
  const navigate = useNavigate();
  const userId = getCurrentUserId();

  const cls = useClassroom(cid);
  const { classroom, members, decks, assignments, loading } = cls;
  const isOwner = classroom != null && classroom.ownerId === userId;

  const [assignmentModalOpen, setAssignmentModalOpen] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<ClassAssignmentDTO | null>(null);
  const [deckPickerOpen, setDeckPickerOpen] = useState(false);
  const [memberSearch, setMemberSearch] = useState("");
  const [tab, setTab] = useState("assignments");
  const [assignmentView, setAssignmentView] = useState<AssignmentView>(() => {
    try { return (localStorage.getItem(ASSIGNMENT_VIEW_KEY) as AssignmentView) ?? "list"; }
    catch { return "list"; }
  });

  const changeAssignmentView = (v: AssignmentView) => {
    setAssignmentView(v);
    try { localStorage.setItem(ASSIGNMENT_VIEW_KEY, v); } catch { /* ignore */ }
  };
  const openStats = (a: ClassAssignmentDTO) => navigate(`/classrooms/${cid}/stats/${a.id}`);

  if (loading || !classroom) {
    return (
      <MainLayout pathName={{ "/classrooms": "Groups" }}>
        <div className="flex items-center justify-center h-60">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
      </MainLayout>
    );
  }

  const copyCode = () => { navigator.clipboard.writeText(classroom.inviteCode); toast.success("Invite code copied."); };
  const regenerate = async () => {
    if (!confirm("Regenerate invite code? The old code stops working.")) return;
    await classroomApi.regenerateInviteCode(cid);
    await cls.refreshAll();
    toast.success("New invite code generated.");
  };

  const visibleAssignments = isOwner ? assignments : assignments.filter((a) => a.status === "PUBLISHED");
  const filteredMembers = members.filter((m) =>
    m.displayName.toLowerCase().includes(memberSearch.toLowerCase())
  );

  const startAssignment = async (a: ClassAssignmentDTO) => {
    try {
      const attempt = await assessmentApi.startAttempt({ quizId: a.quizId, assignmentId: a.id });
      navigate(`/quizzes/${a.quizId}/attempt/${attempt.id}`);
    } catch {
      toast.error("Could not start. You may have reached the attempt limit.");
    }
  };

  const assignmentAction = async (fn: () => Promise<unknown>, msg: string) => {
    try { await fn(); toast.success(msg); await cls.refreshAssignments(); }
    catch { toast.error("Action failed."); }
  };

  return (
    <MainLayout pathName={{ "/classrooms": "Groups", [`/classrooms/${cid}`]: classroom.name }}>
      <div className="space-y-5">
        <Tabs value={tab} onValueChange={setTab} className="space-y-5">
          {/* ── Tabs + contextual action, on one row near the breadcrumb ── */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <TabsList className="justify-start gap-1 h-auto p-1">
              <TabsTrigger value="assignments" className="gap-1.5">
                <ClipboardList className="size-4" />Assignments
              </TabsTrigger>
              <TabsTrigger value="materials" className="gap-1.5">
                <BookOpen className="size-4" />Materials
              </TabsTrigger>
              <TabsTrigger value="members" className="gap-1.5">
                <Users className="size-4" />Members
              </TabsTrigger>
              {isOwner && (
                <TabsTrigger value="settings" className="gap-1.5">Settings</TabsTrigger>
              )}
            </TabsList>

            {/* Right-aligned action that changes with the active tab */}
            <div className="flex items-center gap-2">
              {tab === "assignments" && (
                <>
                  <button
                    onClick={() => changeAssignmentView(assignmentView === "list" ? "card" : "list")}
                    title={assignmentView === "list" ? "Switch to card view" : "Switch to list view"}
                    className="inline-flex size-9 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                  >
                    {assignmentView === "list" ? <LayoutGrid className="size-4" /> : <List className="size-4" />}
                  </button>
                  {isOwner && (
                    <Button size="sm" onClick={() => { setEditingAssignment(null); setAssignmentModalOpen(true); }}>
                      <Plus className="size-4 mr-1.5" />Create assignment
                    </Button>
                  )}
                </>
              )}
              {tab === "materials" && isOwner && (
                <Button size="sm" onClick={() => setDeckPickerOpen(true)}>
                  <Plus className="size-4 mr-1.5" />Add deck
                </Button>
              )}
            </div>
          </div>

          {/* ── Hero Header ── */}
          <Card className="overflow-hidden p-0 border-0 shadow-md">
          {/* Cover banner */}
          <div className="relative h-44 bg-linear-to-br from-violet-500 to-indigo-600">
            {classroom.coverImageUrl && (
              <img src={classroom.coverImageUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
            )}
            <div className="absolute inset-0 bg-linear-to-t from-black/50 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 px-6 pb-4 flex items-end justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="size-12 rounded-2xl bg-white/20 backdrop-blur-sm ring-2 ring-white/30 flex items-center justify-center shrink-0">
                  <GraduationCap className="size-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-white leading-tight">{classroom.name}</h1>
                  {classroom.description && (
                    <p className="text-sm text-white/70 line-clamp-1 mt-0.5">{classroom.description}</p>
                  )}
                </div>
              </div>
              <Badge className="bg-white/20 text-white border-white/30 backdrop-blur-sm shrink-0">
                <Users className="size-3 mr-1" />
                {classroom.memberCount} members
              </Badge>
            </div>
          </div>

          {/* Invite code bar */}
          <div className="flex flex-wrap items-center gap-3 px-6 py-3 border-t border-border/50 bg-card">
            <span className="text-xs text-muted-foreground font-medium">Invite code</span>
            <div className="flex items-center gap-1.5">
              <code className="px-3 py-1 rounded-lg bg-muted font-mono text-sm tracking-[0.2em] font-semibold">
                {classroom.inviteCode}
              </code>
              <Button variant="ghost" size="sm" className="size-8 p-0" onClick={copyCode} title="Copy code">
                <Copy className="size-3.5" />
              </Button>
              {isOwner && (
                <Button variant="ghost" size="sm" className="size-8 p-0" onClick={regenerate} title="Regenerate code">
                  <RefreshCw className="size-3.5" />
                </Button>
              )}
            </div>
          </div>
        </Card>

          {/* ── Assignments ── */}
          <TabsContent value="assignments" className="mt-4 space-y-3">
            {visibleAssignments.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed py-14 text-muted-foreground">
                <ClipboardList className="size-8 opacity-40" />
                <p className="text-sm">No assignments yet.</p>
              </div>
            ) : assignmentView === "list" ? (
              <div className="space-y-2">
                {visibleAssignments.map((a) => (
                  <AssignmentRow
                    key={a.id}
                    a={a}
                    isOwner={isOwner}
                    onStats={() => openStats(a)}
                    onEdit={() => { setEditingAssignment(a); setAssignmentModalOpen(true); }}
                    onPublish={() => assignmentAction(() => classroomApi.publishAssignment(a.id), "Published.")}
                    onClose={() => assignmentAction(() => classroomApi.closeAssignment(a.id), "Closed.")}
                    onStart={() => startAssignment(a)}
                  />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {visibleAssignments.map((a) => (
                  <AssignmentCard
                    key={a.id}
                    a={a}
                    isOwner={isOwner}
                    onStats={() => openStats(a)}
                    onEdit={() => { setEditingAssignment(a); setAssignmentModalOpen(true); }}
                    onPublish={() => assignmentAction(() => classroomApi.publishAssignment(a.id), "Published.")}
                    onClose={() => assignmentAction(() => classroomApi.closeAssignment(a.id), "Closed.")}
                    onStart={() => startAssignment(a)}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          {/* ── Materials ── */}
          <TabsContent value="materials" className="mt-4 space-y-4">
            {decks.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed py-14 text-muted-foreground">
                <BookOpen className="size-8 opacity-40" />
                <p className="text-sm">No decks shared yet.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {decks.map((d) => {
                  const color = COLOR_PRESETS[d.deckId % COLOR_PRESETS.length].swatch;
                  return (
                    <div
                      key={d.id}
                      className="group relative flex flex-col rounded-xl border border-border/60 bg-card shadow-sm cursor-pointer hover:border-primary/40 hover:shadow-lg transition-[box-shadow,border-color] duration-200"
                      onClick={() => navigate(`/deck/${d.deckId}/preview`)}
                    >
                      {/* Gradient header — same style as Library */}
                      <div className="relative h-24 overflow-hidden rounded-t-xl shrink-0" style={{ background: color }}>
                        <div className="absolute -top-5 -right-5 size-20 rounded-full bg-white/10" />
                        <div className="absolute top-6 -right-2 size-10 rounded-full bg-white/10" />
                        <div className="absolute -bottom-3 left-4 size-14 rounded-full bg-black/10" />
                        <div className="absolute bottom-3 left-4 size-10 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-sm">
                          <BookOpen className="size-5 text-white" />
                        </div>
                        {isOwner && (
                          <button
                            type="button"
                            title="Remove from class"
                            className="absolute top-2 right-2 size-7 rounded-md flex items-center justify-center text-white/70 hover:text-white hover:bg-white/20 opacity-0 group-hover:opacity-100 transition-all"
                            onClick={(e) => { e.stopPropagation(); cls.removeDeck(d.deckId).then(() => toast.success("Removed.")); }}
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        )}
                      </div>

                      {/* Card body */}
                      <div className="p-3.5 flex-1 flex flex-col gap-1.5">
                        <p className="text-sm font-semibold line-clamp-2 leading-snug">{d.deckTitle}</p>
                        <div className="mt-auto pt-1">
                          <button
                            type="button"
                            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
                            onClick={(e) => { e.stopPropagation(); navigate(`/deck/${d.deckId}/preview`); }}
                          >
                            <Eye className="size-3.5" />Open deck
                          </button>
                        </div>
                      </div>

                      {/* Hover ring */}
                      <div className="absolute inset-0 rounded-xl pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity ring-2 ring-inset ring-primary/10" />
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* ── Members ── */}
          <TabsContent value="members" className="mt-4 space-y-3">
            <div className="flex items-center gap-2">
              <Input
                value={memberSearch}
                onChange={(e) => setMemberSearch(e.target.value)}
                placeholder="Search members…"
                className="max-w-xs"
              />
              {isOwner && (
                <AddMemberInline onAdd={async (email) => { await cls.addMember(email); toast.success("Member added."); }} />
              )}
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Member</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Joined via</TableHead>
                  <TableHead>Joined</TableHead>
                  {isOwner && <TableHead />}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMembers.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <Avatar className="size-8">
                          <AvatarImage src={m.avatarUrl ?? undefined} />
                          <AvatarFallback className="text-xs">{m.displayName.slice(0, 2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <span className="text-sm font-medium">{m.displayName}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px]">{m.role}</Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{m.joinedVia}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{formatDateTime(m.joinedAt)}</TableCell>
                    {isOwner && (
                      <TableCell>
                        <Button
                          variant="ghost" size="sm"
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={async () => { await cls.removeMember(m.userId); toast.success("Removed."); }}
                        >
                          <UserMinus className="size-4" />
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TabsContent>

          {/* ── Settings ── */}
          {isOwner && (
            <TabsContent value="settings" className="mt-4">
              <SettingsForm
                classroomId={cid}
                initialName={classroom.name}
                initialDescription={classroom.description ?? ""}
                initialMax={classroom.maxMembers}
                initialCover={classroom.coverImageUrl ?? ""}
                onSaved={() => cls.refreshAll()}
                onDeleted={() => navigate("/classrooms")}
              />
            </TabsContent>
          )}
        </Tabs>
      </div>

      <CreateEditAssignmentModal
        classroomId={cid}
        assignment={editingAssignment}
        open={assignmentModalOpen}
        onClose={() => setAssignmentModalOpen(false)}
        onSaved={() => cls.refreshAssignments()}
      />
      <DeckPickerDialog
        open={deckPickerOpen}
        onClose={() => setDeckPickerOpen(false)}
        excludeIds={decks.map((d) => d.deckId)}
        onAdd={async (deckId) => { await cls.addDeck(deckId); toast.success("Deck added."); }}
      />
    </MainLayout>
  );
}

/* ── Assignment item — shared props ── */
interface AssignmentItemProps {
  a: ClassAssignmentDTO;
  isOwner: boolean;
  onStats: () => void;
  onEdit: () => void;
  onPublish: () => void;
  onClose: () => void;
  onStart: () => void;
}

/** Meta line: quiz · due · attempts. */
function AssignmentMeta({ a }: { a: ClassAssignmentDTO }) {
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
      <span className="font-medium text-foreground/70">{a.quizTitle}</span>
      {a.deadline && (
        <>
          <span>·</span>
          <span className="flex items-center gap-1"><CalendarClock className="size-3" />Due {formatDateTime(a.deadline)}</span>
        </>
      )}
      {a.maxAttempts != null && (
        <><span>·</span><span>{a.maxAttempts} attempt{a.maxAttempts !== 1 ? "s" : ""}</span></>
      )}
    </div>
  );
}

/** Owner edit/publish/close actions (stop click-through to the card). */
function OwnerActions({ a, onEdit, onPublish, onClose }: Pick<AssignmentItemProps, "a" | "onEdit" | "onPublish" | "onClose">) {
  const stop = (fn: () => void) => (e: React.MouseEvent) => { e.stopPropagation(); fn(); };
  return (
    <>
      {a.status === "DRAFT" && (
        <Button size="sm" variant="outline" onClick={stop(onEdit)}>Edit</Button>
      )}
      {a.status === "DRAFT" && (
        <Button size="sm" variant="outline"
          className="text-green-700 border-green-300 hover:bg-green-50 dark:hover:bg-green-900/20"
          onClick={stop(onPublish)}>Publish</Button>
      )}
      {a.status === "PUBLISHED" && (
        <Button size="sm" variant="outline" onClick={stop(onClose)}>Close</Button>
      )}
    </>
  );
}

/* ── Assignment — list row ── */
function AssignmentRow({ a, isOwner, onStats, onEdit, onPublish, onClose, onStart }: AssignmentItemProps) {
  const st = STATUS_STYLE[a.status] ?? STATUS_STYLE.DRAFT;
  return (
    <div
      onClick={isOwner ? onStats : undefined}
      className={cn(
        "flex flex-wrap items-center justify-between gap-3 rounded-xl border border-l-4 bg-card px-4 py-3.5 transition-shadow hover:shadow-sm",
        st.border,
        isOwner && "cursor-pointer"
      )}
    >
      <div className="min-w-0 flex-1 space-y-0.5">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-semibold text-sm leading-tight">{a.title}</p>
          <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide", st.badge)}>
            {a.status}
          </span>
        </div>
        <AssignmentMeta a={a} />
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {isOwner ? (
          <>
            <OwnerActions a={a} onEdit={onEdit} onPublish={onPublish} onClose={onClose} />
            <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); onStats(); }}>
              <BarChart3 className="size-4 mr-1.5" />View stats
            </Button>
          </>
        ) : (
          <Button size="sm" onClick={onStart}>
            <Play className="size-4 mr-1.5" />Start
          </Button>
        )}
      </div>
    </div>
  );
}

/* ── Assignment — card ── */
function AssignmentCard({ a, isOwner, onStats, onEdit, onPublish, onClose, onStart }: AssignmentItemProps) {
  const st = STATUS_STYLE[a.status] ?? STATUS_STYLE.DRAFT;
  return (
    <div
      onClick={isOwner ? onStats : undefined}
      className={cn(
        "group relative flex flex-col rounded-xl border border-l-4 bg-card p-4 shadow-sm transition-all hover:shadow-md hover:border-primary/40",
        st.border,
        isOwner && "cursor-pointer"
      )}
    >
      <div className="flex items-start gap-3">
        <div className="size-10 shrink-0 rounded-xl bg-primary/10 flex items-center justify-center">
          <ClipboardList className="size-5 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-sm leading-snug line-clamp-1">{a.title}</p>
            <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide", st.badge)}>
              {a.status}
            </span>
          </div>
          <div className="mt-1"><AssignmentMeta a={a} /></div>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2 border-t border-border/50 pt-3">
        {isOwner ? (
          <>
            <OwnerActions a={a} onEdit={onEdit} onPublish={onPublish} onClose={onClose} />
            <span className="ml-auto flex items-center gap-1 text-xs font-medium text-muted-foreground group-hover:text-primary transition-colors">
              View stats <ChevronRight className="size-3.5" />
            </span>
          </>
        ) : (
          <Button size="sm" className="w-full" onClick={onStart}>
            <Play className="size-4 mr-1.5" />Start
          </Button>
        )}
      </div>
    </div>
  );
}

/* ── Add member by email ── */
function AddMemberInline({ onAdd }: { onAdd: (email: string) => Promise<void> }) {
  const [email, setEmail] = useState("");
  const [adding, setAdding] = useState(false);

  const submit = async () => {
    const value = email.trim();
    if (!value) return;
    setAdding(true);
    try {
      await onAdd(value);
      setEmail("");
    } catch {
      toast.error("No user found with that email.");
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); submit(); } }}
        placeholder="Invite by email…"
        className="w-56"
      />
      <Button variant="outline" size="sm" disabled={!email.trim() || adding} onClick={submit}>
        {adding ? <Loader2 className="size-4 mr-1 animate-spin" /> : <Plus className="size-4 mr-1" />}Add
      </Button>
    </div>
  );
}

/* ── Deck picker ── */
function DeckPickerDialog({
  open, onClose, onAdd, excludeIds,
}: {
  open: boolean; onClose: () => void; onAdd: (deckId: number) => void; excludeIds: number[];
}) {
  const [decks, setDecks] = useState<DeckDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const userId = getCurrentUserId();

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    deckApi.getPage({ page: 0, size: 100 }, undefined, (userId ? { userId } : {}) as never)
      .then((r) => setDecks(r.content ?? []))
      .finally(() => setLoading(false));
  }, [open, userId]);

  const excluded = new Set(excludeIds);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add a deck</DialogTitle>
          <DialogDescription>Share one of your decks with this group.</DialogDescription>
        </DialogHeader>
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-2">
            {decks.map((d) => {
              const added = d.id != null && excluded.has(d.id);
              const color = COLOR_PRESETS[(d.id ?? 0) % COLOR_PRESETS.length].swatch;
              return (
                <div key={d.id} className={cn(
                  "flex items-center gap-3 rounded-lg border px-3 py-2.5 transition-colors",
                  added ? "bg-muted/30 border-muted opacity-70" : "hover:bg-muted/30"
                )}>
                  <div
                    className="size-9 rounded-lg flex items-center justify-center shrink-0 shadow-sm"
                    style={{ background: color }}
                  >
                    <BookOpen className="size-4 text-white" />
                  </div>
                  <span className="flex-1 text-sm font-medium line-clamp-1">{d.title}</span>
                  <Button
                    size="sm" variant={added ? "ghost" : "outline"}
                    disabled={added}
                    className={added ? "text-green-600 gap-1" : ""}
                    onClick={() => d.id != null && onAdd(d.id)}
                  >
                    {added ? <><Check className="size-3.5" />Added</> : "Add"}
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

/* ── Settings ── */
function SettingsForm({
  classroomId, initialName, initialDescription, initialMax, initialCover, onSaved, onDeleted,
}: {
  classroomId: number; initialName: string; initialDescription: string;
  initialMax: number | null; initialCover: string;
  onSaved: () => void; onDeleted: () => void;
}) {
  const [name, setName] = useState(initialName);
  const [description, setDescription] = useState(initialDescription);
  const [maxMembers, setMaxMembers] = useState(initialMax != null ? String(initialMax) : "");
  const [coverImageUrl, setCoverImageUrl] = useState(initialCover);
  const [saving, setSaving] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const coverFileRef = useRef<HTMLInputElement>(null);
  const [uploadingCover, setUploadingCover] = useState(false);

  // Cover image can be a pasted link OR a locally-picked file (uploaded to the
  // file store, which returns a URL we save just like a pasted one).
  const handleCoverFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (coverFileRef.current) coverFileRef.current.value = ""; // allow re-picking same file
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast.error("Please choose an image file."); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error("Image too large (max 5 MB)."); return; }
    setUploadingCover(true);
    try {
      const uploaded = await fileApi.upload(file, "classroom", classroomId, "coverImageUrl");
      setCoverImageUrl(uploaded.url);
      toast.success("Cover image uploaded.");
    } catch {
      toast.error("Upload failed.");
    } finally {
      setUploadingCover(false);
    }
  };

  const save = async () => {
    setSaving(true);
    try {
      await classroomApi.updateClassroom(classroomId, {
        name: name.trim(),
        description: description.trim() || null,
        maxMembers: maxMembers ? Number(maxMembers) : null,
        coverImageUrl: coverImageUrl.trim() || null,
      });
      toast.success("Saved."); onSaved();
    } catch { toast.error("Failed to save."); } finally { setSaving(false); }
  };

  const remove = async () => {
    setDeleting(true);
    try {
      await classroomApi.deleteClassroom(classroomId);
      toast.success("Group deleted.");
      setConfirmOpen(false);
      onDeleted();
    } catch {
      toast.error("Failed to delete.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <div className="space-y-1.5">
        <Label>Group name</Label>
        <Input value={name} onChange={(e) => setName(e.target.value)} className="h-11" />
      </div>
      <div className="space-y-1.5">
        <Label>Description</Label>
        <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} maxLength={500} className="max-h-48 resize-none" />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Max members (blank = ∞)</Label>
        <Input type="number" value={maxMembers} onChange={(e) => setMaxMembers(e.target.value)} className="h-11" />
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Cover image</Label>
        <div className="flex gap-2">
          <Input
            value={coverImageUrl}
            onChange={(e) => setCoverImageUrl(e.target.value)}
            placeholder="Paste an image link (https://…)"
            className="h-11 flex-1"
          />
          <input ref={coverFileRef} type="file" accept="image/*" className="hidden" onChange={handleCoverFile} />
          <Button
            type="button"
            variant="outline"
            className="h-11 shrink-0"
            onClick={() => coverFileRef.current?.click()}
            disabled={uploadingCover}
          >
            {uploadingCover ? <Loader2 className="size-4 animate-spin mr-1.5" /> : <ImageIcon className="size-4 mr-1.5" />}
            Upload
          </Button>
        </div>
        <p className="text-[11px] text-muted-foreground">Paste a link or upload an image from your device (max 5 MB).</p>
        {coverImageUrl && (
          <div className="relative mt-1.5 w-fit">
            <img
              src={coverImageUrl}
              alt="Cover preview"
              className="h-24 rounded-md border border-border object-cover"
            />
            <button
              type="button"
              onClick={() => setCoverImageUrl("")}
              aria-label="Remove cover image"
              className="absolute -right-2 -top-2 rounded-full border border-border bg-background p-0.5 text-muted-foreground shadow-sm transition-colors hover:text-destructive"
            >
              <X className="size-3.5" />
            </button>
          </div>
        )}
      </div>
      <Separator />
      <div className="flex justify-between pt-1">
        <Button variant="outline" className="text-destructive hover:bg-destructive/10" onClick={() => setConfirmOpen(true)}>
          <Trash2 className="size-4 mr-1.5" />Delete group
        </Button>
        <Button onClick={save} disabled={saving}>
          {saving ? <Loader2 className="size-4 animate-spin mr-1.5" /> : null}Save changes
        </Button>
      </div>

      {/* Delete confirmation */}
      <Dialog open={confirmOpen} onOpenChange={(o) => !deleting && setConfirmOpen(o)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete group?</DialogTitle>
            <DialogDescription>
              This permanently deletes “{name.trim() || "this group"}” for everyone. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirmOpen(false)} disabled={deleting}>Cancel</Button>
            <Button
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={remove}
              disabled={deleting}
            >
              {deleting ? <Loader2 className="size-4 animate-spin mr-1.5" /> : <Trash2 className="size-4 mr-1.5" />}
              Delete group
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
