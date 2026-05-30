import axiosInstance from "@/api/axios";
import type {
  ClassAssignmentDTO,
  ClassDeckDTO,
  ClassMemberDTO,
  ClassroomDTO,
  GradebookDTO,
} from "@/types";

/* ─────────────────────────────────────────
   Classrooms
───────────────────────────────────────── */
const getMyClassrooms = async (): Promise<ClassroomDTO[]> => {
  const res = await axiosInstance.get<ClassroomDTO[]>("/classrooms/mine");
  return res.data;
};

const getClassroomById = async (id: number): Promise<ClassroomDTO> => {
  const res = await axiosInstance.get<ClassroomDTO>(`/classrooms/${id}`);
  return res.data;
};

const createClassroom = async (data: Partial<ClassroomDTO>): Promise<ClassroomDTO> => {
  const res = await axiosInstance.post<ClassroomDTO>("/classrooms", { isActive: true, ...data });
  return res.data;
};

const updateClassroom = async (id: number, data: Partial<ClassroomDTO>): Promise<ClassroomDTO> => {
  const res = await axiosInstance.put<ClassroomDTO>(`/classrooms/${id}`, data);
  return res.data;
};

const deleteClassroom = async (id: number): Promise<void> => {
  await axiosInstance.delete(`/classrooms/${id}`);
};

const joinClassroom = async (inviteCode: string): Promise<ClassMemberDTO> => {
  const res = await axiosInstance.post<ClassMemberDTO>("/classrooms/join", { inviteCode });
  return res.data;
};

const regenerateInviteCode = async (classroomId: number): Promise<ClassroomDTO> => {
  const res = await axiosInstance.put<ClassroomDTO>(`/classrooms/${classroomId}/invite-code/regenerate`);
  return res.data;
};

/* ── Members ── */
const getMembers = async (classroomId: number): Promise<ClassMemberDTO[]> => {
  const res = await axiosInstance.get<ClassMemberDTO[]>(`/classrooms/${classroomId}/members`);
  return res.data;
};

const addMember = async (classroomId: number, userId: number): Promise<ClassMemberDTO> => {
  const res = await axiosInstance.post<ClassMemberDTO>(`/classrooms/${classroomId}/members`, { userId });
  return res.data;
};

const removeMember = async (classroomId: number, userId: number): Promise<void> => {
  await axiosInstance.delete(`/classrooms/${classroomId}/members/${userId}`);
};

/* ── Decks ── */
const getDecks = async (classroomId: number): Promise<ClassDeckDTO[]> => {
  const res = await axiosInstance.get<ClassDeckDTO[]>(`/classrooms/${classroomId}/decks`);
  return res.data;
};

const addDeck = async (classroomId: number, deckId: number): Promise<ClassDeckDTO> => {
  const res = await axiosInstance.post<ClassDeckDTO>(`/classrooms/${classroomId}/decks`, { deckId });
  return res.data;
};

const removeDeck = async (classroomId: number, deckId: number): Promise<void> => {
  await axiosInstance.delete(`/classrooms/${classroomId}/decks/${deckId}`);
};

/* ─────────────────────────────────────────
   Assignments
───────────────────────────────────────── */
const getAssignments = async (classroomId: number, status?: string): Promise<ClassAssignmentDTO[]> => {
  const res = await axiosInstance.get<ClassAssignmentDTO[]>("/class-assignments/by-classroom", {
    params: { classroomId, status },
  });
  return res.data;
};

const getAssignmentById = async (id: number): Promise<ClassAssignmentDTO> => {
  const res = await axiosInstance.get<ClassAssignmentDTO>(`/class-assignments/${id}`);
  return res.data;
};

const createAssignment = async (data: Partial<ClassAssignmentDTO>): Promise<ClassAssignmentDTO> => {
  const res = await axiosInstance.post<ClassAssignmentDTO>("/class-assignments", { isActive: true, status: "DRAFT", ...data });
  return res.data;
};

const updateAssignment = async (id: number, data: Partial<ClassAssignmentDTO>): Promise<ClassAssignmentDTO> => {
  const res = await axiosInstance.put<ClassAssignmentDTO>(`/class-assignments/${id}`, data);
  return res.data;
};

const deleteAssignment = async (id: number): Promise<void> => {
  await axiosInstance.delete(`/class-assignments/${id}`);
};

const publishAssignment = async (id: number): Promise<ClassAssignmentDTO> => {
  const res = await axiosInstance.put<ClassAssignmentDTO>(`/class-assignments/${id}/publish`);
  return res.data;
};

const closeAssignment = async (id: number): Promise<ClassAssignmentDTO> => {
  const res = await axiosInstance.put<ClassAssignmentDTO>(`/class-assignments/${id}/close`);
  return res.data;
};

const getGradebook = async (assignmentId: number): Promise<GradebookDTO> => {
  const res = await axiosInstance.get<GradebookDTO>(`/class-assignments/${assignmentId}/gradebook`);
  return res.data;
};

export const classroomApi = {
  getMyClassrooms,
  getClassroomById,
  createClassroom,
  updateClassroom,
  deleteClassroom,
  joinClassroom,
  regenerateInviteCode,
  getMembers,
  addMember,
  removeMember,
  getDecks,
  addDeck,
  removeDeck,
  getAssignments,
  getAssignmentById,
  createAssignment,
  updateAssignment,
  deleteAssignment,
  publishAssignment,
  closeAssignment,
  getGradebook,
};
