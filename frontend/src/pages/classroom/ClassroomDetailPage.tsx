import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { assessmentApi, classroomApi, deckApi } from "@/api";
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
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  BookOpen, Check, ChevronLeft, Copy, GraduationCap, Loader2, Play, Plus, RefreshCw, Trash2, UserMinus,
} from "lucide-react";
import { toast } from "sonner";
import { getCurrentUserId } from "@/utils/auth.utils";
import { CreateEditAssignmentModal } from "./CreateEditAssignmentModal";
import { GradebookModal } from "./GradebookModal";
import { formatDateTime } from "@/pages/assessment/_shared";

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
  const [gradebookId, setGradebookId] = useState<number | null>(null);
  const [deckPickerOpen, setDeckPickerOpen] = useState(false);
  const [memberSearch, setMemberSearch] = useState("");

  if (loading || !classroom) {
    return (
      <MainLayout pathName={{ "/classrooms": "Classrooms" }}>
        <div className="flex items-center justify-center h-60"><Loader2 className="size-5 animate-spin text-muted-foreground" /></div>
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
  const filteredMembers = members.filter((m) => m.displayName.toLowerCase().includes(memberSearch.toLowerCase()));

  const startAssignment = async (a: ClassAssignmentDTO) => {
    try {
      const attempt = await assessmentApi.startAttempt({ quizId: a.quizId, assignmentId: a.id });
      navigate(`/quizzes/${a.quizId}/attempt/${attempt.id}`);
    } catch {
      toast.error("Could not start. You may have reached the attempt limit.");
    }
  };

  const assignmentAction = async (fn: () => Promise<unknown>, msg: string) => {
    try { await fn(); toast.success(msg); await cls.refreshAssignments(); } catch { toast.error("Action failed."); }
  };

  return (
    <MainLayout pathName={{ "/classrooms": "Classrooms", [`/classrooms/${cid}`]: classroom.name }}>
      <div className="space-y-5">
        <button onClick={() => navigate("/classrooms")} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ChevronLeft className="size-4" /> Back to classrooms
        </button>

        {/* Header */}
        <Card className="overflow-hidden p-0">
          <div className="h-24 bg-linear-to-br from-violet-500 to-indigo-600 relative">
            {classroom.coverImageUrl && <img src={classroom.coverImageUrl} alt="" className="w-full h-full object-cover" />}
          </div>
          <div className="p-5 space-y-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                  <GraduationCap className="size-6 text-primary" />{classroom.name}
                </h1>
                {classroom.description && <p className="text-sm text-muted-foreground mt-1">{classroom.description}</p>}
              </div>
              <Badge variant="outline">{classroom.memberCount} members</Badge>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Invite code:</span>
              <code className="px-2 py-1 rounded bg-muted font-mono text-sm tracking-widest">{classroom.inviteCode}</code>
              <Button variant="ghost" size="sm" onClick={copyCode}><Copy className="size-3.5" /></Button>
              {isOwner && <Button variant="ghost" size="sm" onClick={regenerate}><RefreshCw className="size-3.5" /></Button>}
            </div>
          </div>
        </Card>

        <Tabs defaultValue="assignments">
          <TabsList>
            <TabsTrigger value="assignments">Assignments</TabsTrigger>
            <TabsTrigger value="materials">Materials</TabsTrigger>
            <TabsTrigger value="members">Members</TabsTrigger>
            {isOwner && <TabsTrigger value="settings">Settings</TabsTrigger>}
          </TabsList>

          {/* Assignments */}
          <TabsContent value="assignments" className="mt-4 space-y-3">
            {isOwner && (
              <div className="flex justify-end">
                <Button size="sm" onClick={() => { setEditingAssignment(null); setAssignmentModalOpen(true); }}>
                  <Plus className="size-4 mr-1" />Create assignment
                </Button>
              </div>
            )}
            {visibleAssignments.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">No assignments yet.</p>
            ) : (
              visibleAssignments.map((a) => (
                <Card key={a.id} className="p-4 flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold">{a.title}</p>
                      <Badge variant="outline" className="text-[10px]">{a.status}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {a.quizTitle} · {a.deadline ? `Due ${formatDateTime(a.deadline)}` : "No deadline"}
                      {a.maxAttempts != null && ` · ${a.maxAttempts} attempts`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {isOwner ? (
                      <>
                        {a.status === "DRAFT" && <Button size="sm" variant="outline" onClick={() => { setEditingAssignment(a); setAssignmentModalOpen(true); }}>Edit</Button>}
                        {a.status === "DRAFT" && <Button size="sm" variant="outline" onClick={() => assignmentAction(() => classroomApi.publishAssignment(a.id), "Published.")}>Publish</Button>}
                        {a.status === "PUBLISHED" && <Button size="sm" variant="outline" onClick={() => assignmentAction(() => classroomApi.closeAssignment(a.id), "Closed.")}>Close</Button>}
                        <Button size="sm" variant="outline" onClick={() => setGradebookId(a.id)}>Gradebook</Button>
                      </>
                    ) : (
                      <Button size="sm" onClick={() => startAssignment(a)}><Play className="size-4 mr-1" />Start</Button>
                    )}
                  </div>
                </Card>
              ))
            )}
          </TabsContent>

          {/* Materials */}
          <TabsContent value="materials" className="mt-4 space-y-3">
            {isOwner && (
              <div className="flex justify-end">
                <Button size="sm" onClick={() => setDeckPickerOpen(true)}><Plus className="size-4 mr-1" />Add deck</Button>
              </div>
            )}
            {decks.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">No decks shared yet.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {decks.map((d) => (
                  <Card key={d.id} className="p-4 flex items-center gap-3">
                    <div className="size-9 rounded-lg bg-primary/10 flex items-center justify-center"><BookOpen className="size-4 text-primary" /></div>
                    <span className="flex-1 text-sm font-medium line-clamp-1">{d.deckTitle}</span>
                    <Button variant="ghost" size="sm" onClick={() => navigate(`/deck/${d.deckId}/preview`)}>Open</Button>
                    {isOwner && (
                      <Button variant="ghost" size="sm" className="text-destructive" onClick={async () => { await cls.removeDeck(d.deckId); toast.success("Removed."); }}>
                        <Trash2 className="size-4" />
                      </Button>
                    )}
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Members */}
          <TabsContent value="members" className="mt-4 space-y-3">
            <div className="flex items-center gap-2">
              <Input value={memberSearch} onChange={(e) => setMemberSearch(e.target.value)} placeholder="Search members…" className="max-w-xs" />
              {isOwner && <AddMemberInline onAdd={async (uid) => { await cls.addMember(uid); toast.success("Member added."); }} />}
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
                      <div className="flex items-center gap-2">
                        <Avatar className="size-7"><AvatarImage src={m.avatarUrl ?? undefined} /><AvatarFallback>{m.displayName.slice(0, 2).toUpperCase()}</AvatarFallback></Avatar>
                        <span className="text-sm">{m.displayName}</span>
                      </div>
                    </TableCell>
                    <TableCell><Badge variant="outline" className="text-[10px]">{m.role}</Badge></TableCell>
                    <TableCell className="text-xs text-muted-foreground">{m.joinedVia}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{formatDateTime(m.joinedAt)}</TableCell>
                    {isOwner && (
                      <TableCell>
                        <Button variant="ghost" size="sm" className="text-destructive" onClick={async () => { await cls.removeMember(m.userId); toast.success("Removed."); }}>
                          <UserMinus className="size-4" />
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TabsContent>

          {/* Settings */}
          {isOwner && (
            <TabsContent value="settings" className="mt-4">
              <SettingsForm classroomId={cid} initialName={classroom.name} initialDescription={classroom.description ?? ""}
                initialMax={classroom.maxMembers} initialCover={classroom.coverImageUrl ?? ""}
                onSaved={() => cls.refreshAll()} onDeleted={() => navigate("/classrooms")} />
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
      <GradebookModal assignmentId={gradebookId} open={gradebookId != null} onClose={() => setGradebookId(null)} />
      <DeckPickerDialog open={deckPickerOpen} onClose={() => setDeckPickerOpen(false)} excludeIds={decks.map((d) => d.deckId)}
        onAdd={async (deckId) => { await cls.addDeck(deckId); toast.success("Deck added."); }} />
    </MainLayout>
  );
}

/* ── Add member by id ── */
function AddMemberInline({ onAdd }: { onAdd: (userId: number) => Promise<void> }) {
  const [uid, setUid] = useState("");
  return (
    <div className="flex items-center gap-2">
      <Input value={uid} onChange={(e) => setUid(e.target.value)} placeholder="User ID" className="w-28" />
      <Button variant="outline" size="sm" disabled={!uid} onClick={async () => { await onAdd(Number(uid)); setUid(""); }}>
        <Plus className="size-4 mr-1" />Add
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
        <DialogHeader><DialogTitle>Add a deck</DialogTitle><DialogDescription>Share one of your decks with this class.</DialogDescription></DialogHeader>
        {loading ? (
          <div className="flex items-center justify-center h-32"><Loader2 className="size-5 animate-spin text-muted-foreground" /></div>
        ) : (
          <div className="space-y-2">
            {decks.map((d) => {
              const added = d.id != null && excluded.has(d.id);
              return (
                <Card key={d.id} className="p-3 flex items-center gap-3">
                  <span className="flex-1 text-sm line-clamp-1">{d.title}</span>
                  <Button size="sm" variant={added ? "ghost" : "outline"} disabled={added} onClick={() => d.id != null && onAdd(d.id)}>
                    {added ? <Check className="size-4" /> : "Add"}
                  </Button>
                </Card>
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
  classroomId: number; initialName: string; initialDescription: string; initialMax: number | null; initialCover: string;
  onSaved: () => void; onDeleted: () => void;
}) {
  const [name, setName] = useState(initialName);
  const [description, setDescription] = useState(initialDescription);
  const [maxMembers, setMaxMembers] = useState(initialMax != null ? String(initialMax) : "");
  const [coverImageUrl, setCoverImageUrl] = useState(initialCover);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await classroomApi.updateClassroom(classroomId, {
        name: name.trim(), description: description.trim() || null,
        maxMembers: maxMembers ? Number(maxMembers) : null, coverImageUrl: coverImageUrl.trim() || null,
      });
      toast.success("Saved."); onSaved();
    } catch { toast.error("Failed to save."); } finally { setSaving(false); }
  };

  const remove = async () => {
    if (!confirm("Delete this class permanently?")) return;
    try { await classroomApi.deleteClassroom(classroomId); toast.success("Class deleted."); onDeleted(); }
    catch { toast.error("Failed to delete."); }
  };

  return (
    <Card className="p-5 space-y-4 max-w-xl">
      <div className="space-y-1.5"><Label>Class name</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
      <div className="space-y-1.5"><Label>Description</Label><Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} /></div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5"><Label className="text-xs">Max members (blank = ∞)</Label><Input type="number" value={maxMembers} onChange={(e) => setMaxMembers(e.target.value)} /></div>
        <div className="space-y-1.5"><Label className="text-xs">Cover image URL</Label><Input value={coverImageUrl} onChange={(e) => setCoverImageUrl(e.target.value)} /></div>
      </div>
      <div className="flex justify-between pt-2">
        <Button variant="outline" className="text-destructive" onClick={remove}><Trash2 className="size-4 mr-1" />Delete class</Button>
        <Button onClick={save} disabled={saving}>{saving ? <Loader2 className="size-4 animate-spin mr-1" /> : null}Save changes</Button>
      </div>
      <Separator />
    </Card>
  );
}
