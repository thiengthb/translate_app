import { useEffect, useState } from "react";
import { classroomApi } from "@/api";
import type { GradebookDTO } from "@/types";

interface UseGradebookResult {
  gradebook: GradebookDTO | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
}

/** Lazily fetches a gradebook — only when `enabled` is true. */
export function useGradebook(assignmentId: number | null, enabled: boolean): UseGradebookResult {
  const [gradebook, setGradebook] = useState<GradebookDTO | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    if (!enabled || assignmentId == null) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    classroomApi
      .getGradebook(assignmentId)
      .then((data) => {
        if (!cancelled) setGradebook(data);
      })
      .catch(() => {
        if (!cancelled) setError("Failed to load gradebook.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [assignmentId, enabled, nonce]);

  return { gradebook, loading, error, reload: () => setNonce((n) => n + 1) };
}
