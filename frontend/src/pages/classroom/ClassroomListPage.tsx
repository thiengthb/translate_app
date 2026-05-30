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
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { GraduationCap, Loader2, LogIn, Plus, Users } from "lucide-react";
import { toast } from "sonner";
import { getCurrentUserId } from "@/utils/auth.utils";

export default function ClassroomListPage() {
  const navigate = useNavigate();
  const userId = getCurrentUserId();

  const [classrooms, setClassrooms] = useState<ClassroomDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);

  const load = () => {
    setLoading(true);
    classroomApi.getMyClassrooms()
      .then(setClassrooms)
      .catch(() => toast.error("Failed to load classrooms."))
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const owned = classrooms.filter((c) => c.ownerId === userId);
  const joined = classrooms.filter((c) => c.ownerId !== userId);

  return (
    <MainLayout pathName={{ "/classrooms": "Classrooms" }}>
      <div className="space-y-8">
        {/* Owned */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">My classes</h2>
            <Button onClick={() => setCreateOpen(true)}><Plus className="size-4 mr-1" />Create class</Button>
          </div>
          {loading ? (
            <div className="flex items-center justify-center h-32"><Loader2 className="size-5 animate-spin text-muted-foreground" /></div>
          ) : owned.length === 0 ? (
            <p className="text-sm text-muted-foreground">You don't own any classes yet.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {owned.map((c) => <ClassroomCard key={c.id} c={c} owner onClick={() => navigate(`/classrooms/${c.id}`)} />)}
            </div>
          )}
        </section>

        {/* Joined */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Joined classes</h2>
            <Button variant="outline" onClick={() => setJoinOpen(true)}><LogIn className="size-4 mr-1" />Join class</Button>
          </div>
          {joined.length === 0 ? (
            <p className="text-sm text-muted-foreground">You haven't joined any classes.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {joined.map((c) => <ClassroomCard key={c.id} c={c} onClick={() => navigate(`/classrooms/${c.id}`)} />)}
            </div>
          )}
        </section>
      </div>

      <CreateClassDialog open={createOpen} onClose={() => setCreateOpen(false)} onCreated={(c) => { setCreateOpen(false); navigate(`/classrooms/${c.id}`); }} />
      <JoinClassDialog open={joinOpen} onClose={() => setJoinOpen(false)} onJoined={() => { setJoinOpen(false); load(); }} />
    </MainLayout>
  );
}

function ClassroomCard({ c, owner, onClick }: { c: ClassroomDTO; owner?: boolean; onClick: () => void }) {
  return (
    <Card onClick={onClick} className="overflow-hidden cursor-pointer hover:shadow-md transition-shadow p-0">
      <div className="h-20 bg-linear-to-br from-violet-500 to-indigo-600 relative">
        {c.coverImageUrl && <img src={c.coverImageUrl} alt="" className="w-full h-full object-cover" />}
        <div className="absolute bottom-2 left-3 size-9 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center">
          <GraduationCap className="size-5 text-white" />
        </div>
      </div>
      <div className="p-4 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-semibold line-clamp-1">{c.name}</h3>
          <Badge variant="outline" className="text-[10px] shrink-0">{owner ? "Owner" : "Student"}</Badge>
        </div>
        <p className="text-xs text-muted-foreground flex items-center gap-1"><Users className="size-3.5" />{c.memberCount} members</p>
      </div>
    </Card>
  );
}

function CreateClassDialog({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: (c: ClassroomDTO) => void }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!name.trim()) { toast.error("Name is required."); return; }
    setSaving(true);
    try {
      const c = await classroomApi.createClassroom({ name: name.trim(), description: description.trim() || null });
      toast.success("Class created.");
      onCreated(c);
      setName(""); setDescription("");
    } catch {
      toast.error("Failed to create class.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Create class</DialogTitle><DialogDescription>Students join with an invite code.</DialogDescription></DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5"><Label>Class name</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. N3 Vocabulary" /></div>
          <div className="space-y-1.5"><Label>Description</Label><Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} /></div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} disabled={saving}>{saving ? <Loader2 className="size-4 animate-spin mr-1" /> : <Plus className="size-4 mr-1" />}Create</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function JoinClassDialog({ open, onClose, onJoined }: { open: boolean; onClose: () => void; onJoined: () => void }) {
  const [code, setCode] = useState("");
  const [joining, setJoining] = useState(false);

  const submit = async () => {
    if (!code.trim()) return;
    setJoining(true);
    try {
      await classroomApi.joinClassroom(code.trim().toUpperCase());
      toast.success("Joined class!");
      setCode("");
      onJoined();
    } catch (e: unknown) {
      const status = (e as { response?: { status?: number } })?.response?.status;
      toast.error(status === 404 ? "Invalid code." : status === 409 ? "Class is full." : "Could not join.");
    } finally {
      setJoining(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Join a class</DialogTitle><DialogDescription>Enter the invite code from your teacher.</DialogDescription></DialogHeader>
        <Input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="ABC123" className="font-mono text-center text-lg tracking-widest" maxLength={20} />
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} disabled={joining || !code.trim()}>{joining ? <Loader2 className="size-4 animate-spin mr-1" /> : <LogIn className="size-4 mr-1" />}Join</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
