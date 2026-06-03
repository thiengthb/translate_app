/* ─────────────────────────────────────────
   Classroom module types
───────────────────────────────────────── */

export type MemberRole = "STUDENT" | "CO_TEACHER";
export type JoinVia = "INVITE_CODE" | "MANUAL";
export type ScoreStrategy = "LAST" | "HIGHEST";
export type AssignmentStatus = "DRAFT" | "PUBLISHED" | "CLOSED";

export interface ClassroomDTO {
  id: number;
  ownerId: number;
  name: string;
  description: string | null;
  inviteCode: string;
  coverImageUrl: string | null;
  isActive: boolean;
  maxMembers: number | null;
  memberCount: number;
  createdAt: string;
}

export interface ClassMemberDTO {
  id: number;
  classroomId: number;
  userId: number;
  displayName: string;
  avatarUrl: string | null;
  role: MemberRole;
  joinedVia: JoinVia;
  isActive: boolean;
  joinedAt: string;
}

export interface ClassDeckDTO {
  id: number;
  classroomId: number;
  deckId: number;
  deckTitle: string;
  addedBy: number;
  addedAt: string;
}

export interface ClassAssignmentDTO {
  id: number;
  classroomId: number;
  quizId: number;
  quizTitle: string;
  title: string;
  description: string | null;
  maxAttempts: number | null;
  scoreStrategy: ScoreStrategy;
  availableFrom: string | null;
  deadline: string | null;
  status: AssignmentStatus;
  createdAt: string;
}

export interface StudentResultDTO {
  userId: number;
  displayName: string;
  attemptCount: number;
  bestScore: number | null;
  latestScore: number | null;
  isPassed: boolean;
  submittedAt: string | null;
}

export interface GradebookDTO {
  assignmentId: number;
  assignmentTitle: string;
  totalStudents: number;
  passedCount: number;
  averageScore: number;
  results: StudentResultDTO[];
}
