import { useCallback, useEffect, useState } from "react";
import { classroomApi } from "@/api";
import type {
  ClassAssignmentDTO,
  ClassDeckDTO,
  ClassMemberDTO,
  ClassroomDTO,
} from "@/types";

interface UseClassroomResult {
  classroom: ClassroomDTO | null;
  members: ClassMemberDTO[];
  decks: ClassDeckDTO[];
  assignments: ClassAssignmentDTO[];
  loading: boolean;
  error: string | null;
  refreshAll: () => Promise<void>;
  refreshMembers: () => Promise<void>;
  refreshDecks: () => Promise<void>;
  refreshAssignments: () => Promise<void>;
  addMember: (email: string) => Promise<void>;
  removeMember: (userId: number) => Promise<void>;
  addDeck: (deckId: number) => Promise<void>;
  removeDeck: (deckId: number) => Promise<void>;
}

export function useClassroom(classroomId: number | null): UseClassroomResult {
  const [classroom, setClassroom] = useState<ClassroomDTO | null>(null);
  const [members, setMembers] = useState<ClassMemberDTO[]>([]);
  const [decks, setDecks] = useState<ClassDeckDTO[]>([]);
  const [assignments, setAssignments] = useState<ClassAssignmentDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshMembers = useCallback(async () => {
    if (classroomId == null) return;
    setMembers(await classroomApi.getMembers(classroomId));
  }, [classroomId]);

  const refreshDecks = useCallback(async () => {
    if (classroomId == null) return;
    setDecks(await classroomApi.getDecks(classroomId));
  }, [classroomId]);

  const refreshAssignments = useCallback(async () => {
    if (classroomId == null) return;
    setAssignments(await classroomApi.getAssignments(classroomId));
  }, [classroomId]);

  const refreshAll = useCallback(async () => {
    if (classroomId == null) return;
    setLoading(true);
    setError(null);
    try {
      const [c, m, d, a] = await Promise.all([
        classroomApi.getClassroomById(classroomId),
        classroomApi.getMembers(classroomId),
        classroomApi.getDecks(classroomId),
        classroomApi.getAssignments(classroomId),
      ]);
      setClassroom(c);
      setMembers(m);
      setDecks(d);
      setAssignments(a);
    } catch {
      setError("Failed to load classroom.");
    } finally {
      setLoading(false);
    }
  }, [classroomId]);

  useEffect(() => {
    void refreshAll();
  }, [refreshAll]);

  const addMember = useCallback(
    async (email: string) => {
      if (classroomId == null) return;
      await classroomApi.addMemberByEmail(classroomId, email);
      await refreshMembers();
    },
    [classroomId, refreshMembers]
  );

  const removeMember = useCallback(
    async (userId: number) => {
      if (classroomId == null) return;
      await classroomApi.removeMember(classroomId, userId);
      await refreshMembers();
    },
    [classroomId, refreshMembers]
  );

  const addDeck = useCallback(
    async (deckId: number) => {
      if (classroomId == null) return;
      await classroomApi.addDeck(classroomId, deckId);
      await refreshDecks();
    },
    [classroomId, refreshDecks]
  );

  const removeDeck = useCallback(
    async (deckId: number) => {
      if (classroomId == null) return;
      await classroomApi.removeDeck(classroomId, deckId);
      await refreshDecks();
    },
    [classroomId, refreshDecks]
  );

  return {
    classroom,
    members,
    decks,
    assignments,
    loading,
    error,
    refreshAll,
    refreshMembers,
    refreshDecks,
    refreshAssignments,
    addMember,
    removeMember,
    addDeck,
    removeDeck,
  };
}
