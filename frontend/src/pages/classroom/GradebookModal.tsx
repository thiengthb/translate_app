import { useGradebook } from "@/hooks/useGradebook";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { Download, Loader2 } from "lucide-react";
import { formatDateTime } from "@/pages/assessment/_shared";

export function GradebookModal({
  assignmentId, open, onClose,
}: {
  assignmentId: number | null;
  open: boolean;
  onClose: () => void;
}) {
  const { gradebook, loading } = useGradebook(assignmentId, open);

  const exportCsv = () => {
    if (!gradebook) return;
    const header = ["Student", "Attempts", "Best score", "Latest score", "Status", "Submitted at"];
    const rows = gradebook.results.map((r) => [
      r.displayName,
      String(r.attemptCount),
      r.bestScore != null ? String(r.bestScore) : "",
      r.latestScore != null ? String(r.latestScore) : "",
      r.submittedAt ? (r.isPassed ? "Passed" : "Failed") : "Not submitted",
      r.submittedAt ?? "",
    ]);
    const csv = [header, ...rows].map((row) => row.map((c) => `"${c.replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `gradebook-${gradebook.assignmentTitle.replace(/\s+/g, "_")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-3xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Gradebook</DialogTitle>
          <DialogDescription>{gradebook?.assignmentTitle}</DialogDescription>
        </DialogHeader>

        {loading || !gradebook ? (
          <div className="flex items-center justify-center h-40"><Loader2 className="size-5 animate-spin text-muted-foreground" /></div>
        ) : (
          <>
            {/* Header stats */}
            <div className="grid grid-cols-4 gap-3">
              <Stat label="Students" value={gradebook.totalStudents} />
              <Stat label="Passed" value={gradebook.passedCount} tone="text-green-600" />
              <Stat label="Pass rate" value={`${gradebook.totalStudents ? Math.round((gradebook.passedCount / gradebook.totalStudents) * 100) : 0}%`} />
              <Stat label="Avg score" value={gradebook.averageScore.toFixed(1)} />
            </div>

            <div className="flex justify-end">
              <Button variant="outline" size="sm" onClick={exportCsv}><Download className="size-4 mr-1" />Export CSV</Button>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead className="text-center">Attempts</TableHead>
                  <TableHead className="text-center">Best</TableHead>
                  <TableHead className="text-center">Latest</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead>Submitted</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {gradebook.results.map((r) => (
                  <TableRow key={r.userId}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Avatar className="size-7"><AvatarFallback>{r.displayName.slice(0, 2).toUpperCase()}</AvatarFallback></Avatar>
                        <span className="text-sm">{r.displayName}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center text-sm">{r.attemptCount}</TableCell>
                    <TableCell className={cn("text-center text-sm", r.isPassed && "font-semibold")}>{r.bestScore ?? "—"}</TableCell>
                    <TableCell className="text-center text-sm">{r.latestScore ?? "—"}</TableCell>
                    <TableCell className="text-center">
                      {r.submittedAt == null ? (
                        <Badge variant="outline" className="border-0 bg-zinc-500/15 text-zinc-500">Not submitted</Badge>
                      ) : r.isPassed ? (
                        <Badge variant="outline" className="border-0 bg-green-500/15 text-green-600">Passed</Badge>
                      ) : (
                        <Badge variant="outline" className="border-0 bg-red-500/15 text-red-600">Failed</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{formatDateTime(r.submittedAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Stat({ label, value, tone }: { label: string; value: number | string; tone?: string }) {
  return (
    <div className="rounded-lg border p-3 text-center">
      <p className={cn("text-xl font-bold tabular-nums", tone)}>{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
