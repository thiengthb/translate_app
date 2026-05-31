import { Logout } from "@/components/auth/Logout";
import { OAuth2RedirectHandler } from "@/components/auth/OAuth2RedirectHandler";
import CheckYourEmailPage from "@/pages/auth/CheckYourEmailPage";
import ForgotPasswordPage from "@/pages/auth/ForgotPasswordPage";
import { Login } from "@/pages/auth/Login";
import RegisterPage from "@/pages/auth/RegisterPage";
import NotFoundPage from "@/pages/error/NotFoundPage";
import { Unauthorized } from "@/pages/error/Unauthorized";
import { Dashboard } from "@/pages/management/dashboard";
import AuditLogPage from "@/pages/auditLog/AuditLogPage";
import KeyboardShortcutsPage from "@/pages/help/KeyboardShortcutsPage";
import NotificationsPage from "@/pages/notifications/NotificationsPage";
import StudentLandingPage from "@/pages/student/StudentLandingPage";
import TeacherLandingPage from "@/pages/teacher/TeacherLandingPage";
import ProfilePage from "@/pages/profile/ProfilePage";
import SettingsPage from "@/pages/settings/SettingsPage";
import StreakPage from "@/pages/streak/StreakPage";
import UsersPage from "@/pages/management/rbac/user/UsersPage";
import LeaderboardPage from "@/pages/leaderboard/LeaderboardPage";
import PublicProfilePage from "@/pages/publicProfile/PublicProfilePage";
import AnalyzePage from "@/pages/analyze/AnalyzePage";
import ProductionPage from "@/pages/production/ProductionPage";
import DictionaryPage from "@/pages/dictionary/DictionaryPage";
import WordCreatePage from "@/pages/dictionary/WordCreatePage";
import LibraryPage from "@/pages/student/LibraryPage";
import CommunityPage from "@/pages/student/CommunityPage";
import DeckPreviewPage from "@/pages/student/DeckPreviewPage";
import CreateDeckPage from "@/pages/student/CreateDeckPage";
import CreateQuizletDeckPage from "@/pages/student/CreateQuizletDeckPage";
import EditQuizletDeckPage from "@/pages/student/EditQuizletDeckPage";
import CreateAnkiDeckPage from "@/pages/student/CreateAnkiDeckPage";
import FlashcardStudyPage from "@/pages/student/FlashcardStudyPage";
import AnkiStudyPage from "@/pages/student/AnkiStudyPage";
import QuizListPage from "@/pages/assessment/QuizListPage";
import QuestionBankPage from "@/pages/assessment/QuestionBankPage";
import QuestionFormPage from "@/pages/assessment/QuestionFormPage";
import QuizDetailPage from "@/pages/assessment/QuizDetailPage";
import QuizCreateEditPage from "@/pages/assessment/QuizCreateEditPage";
import QuizSessionPage from "@/pages/assessment/QuizSessionPage";
import QuizResultPage from "@/pages/assessment/QuizResultPage";
import ClassroomListPage from "@/pages/classroom/ClassroomListPage";
import ClassroomDetailPage from "@/pages/classroom/ClassroomDetailPage";
import type { ComponentType } from "react";
import { buildEntityRoutes } from "./build-router";

export interface RouteConfig {
  path: string;
  component: ComponentType<any>;
  requiredPermission?: string;
  isPublic?: boolean;
  isModuleDriven?: boolean;
}

export const routes: RouteConfig[] = [
  { path: "/dashboard", component: Dashboard, isModuleDriven: true },
  { path: "/dictionary", component: DictionaryPage, isModuleDriven: true },
  { path: "/words/create", component: WordCreatePage, requiredPermission: "WORD_CREATE" },
  { path: "/student", component: StudentLandingPage },
  { path: "/teacher", component: TeacherLandingPage },
  { path: "/library", component: LibraryPage, isModuleDriven: true },
  { path: "/community", component: CommunityPage, isModuleDriven: true },
  { path: "/deck/:deckId/preview", component: DeckPreviewPage, requiredPermission: "DECK_READ" },
  { path: "/create-deck", component: CreateDeckPage, requiredPermission: "DECK_CREATE" },
  { path: "/create-deck/quizlet", component: CreateQuizletDeckPage, requiredPermission: "DECK_CREATE" },
  { path: "/create-deck/anki", component: CreateAnkiDeckPage, requiredPermission: "DECK_CREATE" },
  { path: "/deck/:deckId/edit", component: EditQuizletDeckPage, requiredPermission: "DECK_UPDATE" },
  { path: "/deck/:deckId", component: FlashcardStudyPage, requiredPermission: "DECK_READ" },
  { path: "/deck/:deckId/anki", component: AnkiStudyPage, requiredPermission: "ANKI_SRS_PROGRESS_READ" },

  // ── Assessment ──
  { path: "/questions", component: QuestionBankPage, isModuleDriven: true },
  { path: "/questions/new", component: QuestionFormPage, requiredPermission: "QUESTION_CREATE" },
  { path: "/questions/:questionId/edit", component: QuestionFormPage, requiredPermission: "QUESTION_UPDATE" },
  // /question-tags is now driven by the entityConfig at
  // pages/management/assessment/question-tag/index.tsx (ProTable via AutoCrudPage),
  // auto-registered through buildEntityRoutes() — same pattern as the Users page.
  { path: "/quizzes", component: QuizListPage, isModuleDriven: true },
  { path: "/quizzes/create", component: QuizCreateEditPage, requiredPermission: "QUIZ_CREATE" },
  { path: "/quizzes/:quizId", component: QuizDetailPage, requiredPermission: "QUIZ_READ" },
  { path: "/quizzes/:quizId/edit", component: QuizCreateEditPage, requiredPermission: "QUIZ_UPDATE" },
  { path: "/quizzes/:quizId/attempt/:attemptId", component: QuizSessionPage, requiredPermission: "QUIZ_ATTEMPT_CREATE" },
  { path: "/quizzes/:quizId/result/:attemptId", component: QuizResultPage, requiredPermission: "QUIZ_ATTEMPT_READ" },

  // ── Classroom ──
  { path: "/classrooms", component: ClassroomListPage, isModuleDriven: true },
  { path: "/classrooms/:classroomId", component: ClassroomDetailPage, requiredPermission: "CLASSROOM_READ" },
  ...buildEntityRoutes(),
  { path: "/profile", component: ProfilePage },
  { path: "/settings", component: SettingsPage },
  { path: "/streak", component: StreakPage },
  { path: "/help/shortcuts", component: KeyboardShortcutsPage },
  { path: "/notifications", component: NotificationsPage },
  { path: "/audit-logs", component: AuditLogPage, requiredPermission: "AUDIT_READ" },
  { path: "/leaderboard", component: LeaderboardPage, isModuleDriven: true },
  // /users overrides the buildEntityRoutes AutoCrudPage default — wraps
  // it in a tabbed page that also exposes User Analytics. Static (not
  // module-driven) so App.tsx routes via staticRoutePaths short-circuit
  // and skips the module-driven AutoCrudPage for the same URL.
  { path: "/users", component: UsersPage, requiredPermission: "USER_READ" },
  { path: "/users/:userId", component: PublicProfilePage },
  { path: "/analyze", component: AnalyzePage },
  { path: "/production", component: ProductionPage },

  { path: "/not-found-page", component: NotFoundPage, isPublic: true },
  { path: "/login", component: Login, isPublic: true },
  { path: "/logout", component: Logout, isPublic: true },
  { path: "/register", component: RegisterPage, isPublic: true },
  { path: "/check-email", component: CheckYourEmailPage, isPublic: true },
  { path: "/forgot-password", component: ForgotPasswordPage, isPublic: true },
  { path: "/oauth2/redirect", component: OAuth2RedirectHandler, isPublic: true,},
  { path: "/unauthorized", component: Unauthorized, isPublic: true },
];
