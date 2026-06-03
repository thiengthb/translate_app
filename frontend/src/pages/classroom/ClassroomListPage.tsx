import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { classroomApi } from "@/api";
import type { ClassroomDTO } from "@/types";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Check, Copy, GraduationCap, Loader2, LogIn, Plus, Search, Users } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { DataPagination } from "@/components/common/DataPagination";
import { ScrollHintContainer } from "@/components/common/ScrollHintContainer";
import { getCurrentUserId } from "@/utils/auth.utils";
import { COLOR_PRESETS } from "@/lib/color-presets";

const PAGE_SIZES = [12, 24, 48];

export default function ClassroomListPage() {
  const navigate = useNavigate();
  const userId = getCurrentUserId();

  const [classrooms, setClassrooms] = useState<ClassroomDTO[]>([]);
  const [loading, setLoading]       = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [joinOpen, setJoinOpen]     = useState(false);
  const [search, setSearch]         = useState("");
  const [tab, setTab]               = useState<"mine" | "joined">("mine");
  const [page, setPage]             = useState(1);
  const [pageSize, setPageSize]     = useState(PAGE_SIZES[0]);

  const load = () => {
    setLoading(true);
    classroomApi.getMyClassrooms()
      .then(setClassrooms)
      .catch(() => toast.error("Failed to load groups."))
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const term    = search.trim().toLowerCase();
  const matches = (c: ClassroomDTO) =>
    !term || c.name.toLowerCase().includes(term) || (c.description ?? "").toLowerCase().includes(term);
  const owned  = classrooms.filter((c) => c.ownerId === userId && matches(c));
  const joined = classrooms.filter((c) => c.ownerId !== userId && matches(c));

  useEffect(() => { setPage(1); }, [tab, term, pageSize]);

  const activeList = tab === "mine" ? owned : joined;
  const totalPages = Math.max(1, Math.ceil(activeList.length / pageSize));
  const safePage   = Math.min(page, totalPages);
  const pageStart  = (safePage - 1) * pageSize;
  const pageItems  = activeList.slice(pageStart, pageStart + pageSize);

  return (
    <MainLayout pathName={{ "/classrooms": "Groups" }}>
      <div className="flex flex-col w-full flex-1 min-h-0 overflow-hidden">

        {/* ── Toolbar ── */}
        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <div className="relative flex-1 min-w-50">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search groups…"
              className="pl-9"
            />
          </div>
          <Button variant="outline" onClick={() => setJoinOpen(true)}>
            <LogIn className="size-4 mr-1.5" />Join group
          </Button>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="size-4 mr-1.5" />Create group
          </Button>
        </div>

        {loading ? (
          <div className="flex flex-1 items-center justify-center">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <Tabs
            value={tab}
            onValueChange={(v) => setTab(v as "mine" | "joined")}
            className="flex flex-col flex-1 min-h-0 mt-4"
          >
            <TabsList className="shrink-0 self-start">
              <TabsTrigger value="mine" className="gap-2">
                My groups <TabCount n={owned.length} />
              </TabsTrigger>
              <TabsTrigger value="joined" className="gap-2">
                Joined groups <TabCount n={joined.length} />
              </TabsTrigger>
            </TabsList>

            <ScrollHintContainer axis="vertical" className="flex-1 min-h-0 mt-4">
              {tab === "mine" ? (
                <GroupGrid
                  emptyIcon={<GraduationCap className="size-9 opacity-40" />}
                  emptyText={term ? "No owned groups match your search." : "You don't own any groups yet."}
                  emptyAction={!term && (
                    <Button variant="outline" size="sm" onClick={() => setCreateOpen(true)}>
                      <Plus className="size-4 mr-1" />Create your first group
                    </Button>
                  )}
                  count={owned.length}
                >
                  {pageItems.map((c) => (
                    <GroupCard key={c.id} c={c} owner onClick={() => navigate(`/classrooms/${c.id}`)} />
                  ))}
                </GroupGrid>
              ) : (
                <GroupGrid
                  emptyIcon={<Users className="size-9 opacity-40" />}
                  emptyText={term ? "No joined groups match your search." : "You haven't joined any groups yet."}
                  emptyAction={!term && (
                    <Button variant="outline" size="sm" onClick={() => setJoinOpen(true)}>
                      <LogIn className="size-4 mr-1" />Join with a code
                    </Button>
                  )}
                  count={joined.length}
                >
                  {pageItems.map((c) => (
                    <GroupCard key={c.id} c={c} onClick={() => navigate(`/classrooms/${c.id}`)} />
                  ))}
                </GroupGrid>
              )}
            </ScrollHintContainer>
          </Tabs>
        )}

        {/* ── Pagination ── */}
        {!loading && activeList.length > 0 && (
          <div className="shrink-0 border-t border-border bg-background px-2 py-2 mt-px flex flex-wrap items-center justify-end gap-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="tabular-nums">
                Total: <span className="font-semibold text-foreground">{activeList.length}</span>
              </span>
              <Select value={String(pageSize)} onValueChange={(v) => setPageSize(Number(v))}>
                <SelectTrigger className="h-8 w-28"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PAGE_SIZES.map((s) => (
                    <SelectItem key={s} value={String(s)}>{s} / page</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DataPagination currentPage={safePage} totalPages={totalPages} onPageChange={setPage} />
          </div>
        )}
      </div>

      <CreateGroupDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={(c) => { setCreateOpen(false); navigate(`/classrooms/${c.id}`); }}
      />
      <JoinGroupDialog
        open={joinOpen}
        onClose={() => setJoinOpen(false)}
        onJoined={() => { setJoinOpen(false); load(); }}
      />
    </MainLayout>
  );
}

/* ── Tab count pill ── */
function TabCount({ n }: { n: number }) {
  return (
    <span className="inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full bg-muted text-xs font-medium text-muted-foreground tabular-nums">
      {n}
    </span>
  );
}

/* ── Grid / empty state ── */
function GroupGrid({
  count, emptyIcon, emptyText, emptyAction, children,
}: {
  count: number;
  emptyIcon: React.ReactNode;
  emptyText: string;
  emptyAction?: React.ReactNode;
  children: React.ReactNode;
}) {
  if (count === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed py-14 text-muted-foreground">
        {emptyIcon}
        <p className="text-sm">{emptyText}</p>
        {emptyAction}
      </div>
    );
  }
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 items-start">
      {children}
    </div>
  );
}

/* ── Group card — Library deck-card pattern ── */
function GroupCard({ c, owner, onClick }: { c: ClassroomDTO; owner?: boolean; onClick: () => void }) {
  const [copied, setCopied] = useState(false);
  const color = COLOR_PRESETS[c.id % COLOR_PRESETS.length].swatch;

  const copyCode = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(c.inviteCode);
      setCopied(true);
      toast.success("Invite code copied.");
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Couldn't copy code.");
    }
  };

  return (
    <Card
      onClick={onClick}
      className={cn(
        "group relative flex flex-col overflow-hidden cursor-pointer p-0 gap-0",
        "border-border/60 hover:border-primary/40 hover:shadow-lg hover:-translate-y-0.5",
        "transition-all duration-200"
      )}
    >
      {/* ── Coloured header — same blobs as Library deck cards ── */}
      <div className="relative h-24 overflow-hidden rounded-t-xl shrink-0" style={{ background: color }}>
        {c.coverImageUrl && (
          <img src={c.coverImageUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
        )}
        {/* Decorative blobs */}
        <div className="absolute -top-5 -right-5 size-20 rounded-full bg-white/10" />
        <div className="absolute top-6 -right-2 size-10 rounded-full bg-white/10" />
        <div className="absolute -bottom-3 left-4 size-14 rounded-full bg-black/10" />
        {/* Hover tint */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
        {/* Icon box */}
        <div className="absolute bottom-3 left-4 size-10 rounded-xl bg-white/20 backdrop-blur-sm ring-1 ring-white/30 flex items-center justify-center shadow-sm">
          <GraduationCap className="size-5 text-white" />
        </div>
        {/* Role badge */}
        <Badge className="absolute top-2 right-2 border-white/30 bg-white/20 text-white backdrop-blur-sm text-[10px]">
          {owner ? "Owner" : "Member"}
        </Badge>
      </div>

      {/* ── Card body ── */}
      <div className="p-3.5 flex flex-col gap-1.5 flex-1">
        <h3 className="font-semibold text-sm line-clamp-1 leading-snug">{c.name}</h3>
        <p className="text-xs text-muted-foreground line-clamp-2 min-h-10">
          {c.description || <span className="italic opacity-50">No description</span>}
        </p>

        {/* Footer */}
        <div className="flex items-center justify-between gap-2 pt-2 mt-auto border-t border-border/50">
          <span className="text-xs text-muted-foreground flex items-center gap-1 tabular-nums">
            <Users className="size-3.5" />
            {c.memberCount}{c.maxMembers != null ? `/${c.maxMembers}` : ""} members
          </span>
          {owner && (
            <button
              type="button"
              onClick={copyCode}
              title="Copy invite code"
              className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 font-mono text-[11px] text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            >
              {copied ? <Check className="size-3 text-green-600" /> : <Copy className="size-3" />}
              {c.inviteCode}
            </button>
          )}
        </div>
      </div>

      {/* Hover ring */}
      <div className="absolute inset-0 rounded-xl pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity ring-2 ring-inset ring-primary/10" />
    </Card>
  );
}

/* ── Create group dialog ── */
function CreateGroupDialog({ open, onClose, onCreated }: {
  open: boolean; onClose: () => void; onCreated: (c: ClassroomDTO) => void;
}) {
  const [name, setName]               = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving]           = useState(false);

  const submit = async () => {
    if (!name.trim()) { toast.error("Name is required."); return; }
    setSaving(true);
    try {
      const c = await classroomApi.createClassroom({ name: name.trim(), description: description.trim() || null });
      toast.success("Group created.");
      onCreated(c);
      setName(""); setDescription("");
    } catch {
      toast.error("Failed to create group.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create group</DialogTitle>
          <DialogDescription>Members join with an invite code.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Group name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. N3 Vocabulary" />
          </div>
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="What is this group about?"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} disabled={saving}>
            {saving ? <Loader2 className="size-4 animate-spin mr-1" /> : <Plus className="size-4 mr-1" />}Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ── Join group dialog ── */
function JoinGroupDialog({ open, onClose, onJoined }: {
  open: boolean; onClose: () => void; onJoined: () => void;
}) {
  const [code, setCode]       = useState("");
  const [joining, setJoining] = useState(false);

  const submit = async () => {
    if (!code.trim()) return;
    setJoining(true);
    try {
      await classroomApi.joinClassroom(code.trim().toUpperCase());
      toast.success("Joined group!");
      setCode("");
      onJoined();
    } catch (e: unknown) {
      const resp = (e as { response?: { status?: number; data?: { message?: string } } })?.response;
      const status = resp?.status;
      // Prefer the server's reason (e.g. "You are already a member…", "Classroom is full")
      // and fall back to a status-based message.
      toast.error(
        resp?.data?.message ||
          (status === 404 ? "Invalid code." : status === 409 ? "You can't join this group." : "Could not join."),
      );
    } finally {
      setJoining(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Join a group</DialogTitle>
          <DialogDescription>Enter the invite code from the group owner.</DialogDescription>
        </DialogHeader>
        <Input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="ABC123"
          className="font-mono text-center text-lg tracking-widest"
          maxLength={20}
        />
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} disabled={joining || !code.trim()}>
            {joining ? <Loader2 className="size-4 animate-spin mr-1" /> : <LogIn className="size-4 mr-1" />}Join
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
