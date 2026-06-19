import { Logout } from "@/components/auth/Logout";
import { OAuth2RedirectHandler } from "@/components/auth/OAuth2RedirectHandler";
import { LoginRouteRedirect, RegisterRouteRedirect } from "@/components/auth/AuthRouteRedirect";
import CheckYourEmailPage from "@/pages/auth/CheckYourEmailPage";
import ForgotPasswordPage from "@/pages/auth/ForgotPasswordPage";
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
import ReviewPage from "@/pages/production/ReviewPage";
import GrammarDashboardPage from "@/pages/grammar/GrammarDashboardPage";
import GrammarSessionPage from "@/pages/grammar/GrammarSessionPage";
import GrammarLevelPage from "@/pages/grammar/GrammarLevelPage";
import GrammarDetailPage from "@/pages/grammar/GrammarDetailPage";
import DictionaryPage from "@/pages/dictionary/DictionaryPage";
import NotebookPage from "@/pages/dictionary/NotebookPage";
import VocabularyBrowsePage from "@/pages/dictionary/VocabularyBrowsePage";
import WordCreatePage from "@/pages/dictionary/WordCreatePage";
import WordDetailPage from "@/pages/dictionary/WordDetailPage";
import LibraryPage from "@/pages/student/LibraryPage";
import CommunityPage from "@/pages/student/CommunityPage";
import DeckPreviewPage from "@/pages/student/DeckPreviewPage";
import CreateDeckPage from "@/pages/student/CreateDeckPage";
import ImportDeckPage from "@/pages/student/ImportDeckPage";
import EditQuizletDeckPage from "@/pages/student/EditQuizletDeckPage";
import CardTemplateEditPage from "@/pages/student/CardTemplateEditPage";
import CardTemplatePreviewPage from "@/pages/student/CardTemplatePreviewPage";
import DeckStudyPage from "@/features/deck-study/DeckStudyPage";
import FlashcardSchedulePreviewPage from "@/pages/student/FlashcardSchedulePreviewPage";
import AnkiCardEditPage from "@/pages/student/AnkiCardEditPage";
import AnkiTemplateEditPage from "@/pages/student/AnkiTemplateEditPage";
import AnkiStatsPage from "@/pages/student/AnkiStatsPage";
import QuizListPage from "@/pages/assessment/QuizListPage";
import QuestionBankPage from "@/pages/assessment/QuestionBankPage";
import QuestionFormPage from "@/pages/assessment/QuestionFormPage";
import QuizDetailPage from "@/pages/assessment/QuizDetailPage";
import QuizCreateEditPage from "@/pages/assessment/QuizCreateEditPage";
import QuizSessionPage from "@/pages/assessment/QuizSessionPage";
import QuizResultPage from "@/pages/assessment/QuizResultPage";
import ClassroomListPage from "@/pages/classroom/ClassroomListPage";
import ClassroomDetailPage from "@/pages/classroom/ClassroomDetailPage";
import KanjiRadicalGamePage from "@/pages/games/kanji-radical/KanjiRadicalGamePage";
import AssignmentStatsPage from "@/pages/classroom/AssignmentStatsPage";
import KanjiHomePage from "@/pages/kanji-study/KanjiHomePage";
import KanjiDeckListPage from "@/pages/kanji-study/KanjiDeckListPage";
import KanjiDeckBrowsePage from "@/pages/kanji-study/KanjiDeckBrowsePage";
import KanjiDetailPage from "@/pages/kanji-study/KanjiDetailPage";
import KanjiRadicalListPage from "@/pages/kanji-study/KanjiRadicalListPage";
import KanjiReadingSetListPage from "@/pages/kanji-study/KanjiReadingSetListPage";
import KanjiReviewPage from "@/pages/kanji-study/KanjiReviewPage";
import { lazy, type ComponentType, type LazyExoticComponent } from "react";
import { buildEntityRoutes } from "./build-router";

const KanaSharkPage = lazy(() => import("@/pages/student/learning/KanaSharkPage"));

export type RouteComponent =
  | ComponentType<Record<string, never>>
  | LazyExoticComponent<ComponentType<Record<string, never>>>;

export interface RouteConfig {
  path: string;
  component: RouteComponent;
  requiredPermission?: string;
  isPublic?: boolean;
  isModuleDriven?: boolean;
}

export const routes: RouteConfig[] = [
  { path: "/dashboard", component: Dashboard, isModuleDriven: true },
  { path: "/dictionary", component: DictionaryPage, isModuleDriven: true },
  { path: "/notebook", component: NotebookPage, isModuleDriven: true },
  { path: "/vocabulary", component: VocabularyBrowsePage, isModuleDriven: true },
  { path: "/words/create", component: WordCreatePage, requiredPermission: "WORD_CREATE" },
  { path: "/words/:wordId", component: WordDetailPage, requiredPermission: "WORD_READ" },
  { path: "/student", component: StudentLandingPage },
  { path: "/teacher", component: TeacherLandingPage },
  { path: "/library", component: LibraryPage, isModuleDriven: true },
  { path: "/community", component: CommunityPage, isModuleDriven: true },
  { path: "/deck/:deckId/preview", component: DeckPreviewPage, requiredPermission: "DECK_READ" },
  { path: "/create-deck", component: CreateDeckPage, requiredPermission: "DECK_CREATE" },
  { path: "/decks/import", component: ImportDeckPage, requiredPermission: "DECK_CREATE" },
  // Card-template management is the base-CRUD ProTable (entityConfig at
  // pages/management/library/card-template/index.tsx, auto-registered via
  // buildEntityRoutes + the @ResourceMenu module). Create / Edit route to the
  // standalone, deck-independent designer below.
  { path: "/card-templates/new", component: CardTemplateEditPage, requiredPermission: "FLASHCARD_TEMPLATE_CREATE" },
  { path: "/card-templates/:templateId/preview", component: CardTemplatePreviewPage, requiredPermission: "FLASHCARD_TEMPLATE_READ" },
  { path: "/card-templates/:templateId/edit", component: CardTemplateEditPage, requiredPermission: "FLASHCARD_TEMPLATE_UPDATE" },
  { path: "/deck/:deckId/edit", component: EditQuizletDeckPage, requiredPermission: "DECK_UPDATE" },
  { path: "/deck/:deckId", component: DeckStudyPage, requiredPermission: "DECK_READ" },
  // Legacy alias — the unified study screen detects the `/anki` suffix and
  // defaults to SRS mode, keeping old links + the Anki editors' backTo working.
  { path: "/deck/:deckId/anki", component: DeckStudyPage, requiredPermission: "DECK_READ" },
  { path: "/deck/:deckId/card/:flashcardId/edit", component: AnkiCardEditPage, requiredPermission: "DECK_UPDATE" },
  { path: "/deck/:deckId/anki/template", component: AnkiTemplateEditPage, requiredPermission: "DECK_UPDATE" },
  { path: "/deck/:deckId/srs-preview", component: FlashcardSchedulePreviewPage, requiredPermission: "DECK_READ" },
  { path: "/stats", component: AnkiStatsPage, isModuleDriven: true },
  { path: "/student/learning/kana-shark", component: KanaSharkPage, requiredPermission: "ANKI_SRS_PROGRESS_READ" },

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

  // ── Games ──
  // Static (always available to any authenticated user). The board is
  // fully client-side today; radical/prompt data is a placeholder that
  // can be swapped for a backend feed later without touching the route.
  { path: "/kanji-radical", component: KanjiRadicalGamePage },

  { path: "/classrooms/:classroomId/stats/:assignmentId", component: AssignmentStatsPage, requiredPermission: "CLASSROOM_READ" },
  // Static (not module-driven) so the route always resolves — the Kanji
  // dashboard is the feature's own landing, reached from the sidebar menu
  // or a dedicated entry button, independent of the DB Module table.
  { path: "/kanji-study", component: KanjiHomePage, requiredPermission: "KANJI_DECK_READ" },
  { path: "/kanji-study/decks", component: KanjiDeckListPage, requiredPermission: "KANJI_DECK_READ" },
  { path: "/kanji-study/deck/:deckId", component: KanjiDeckBrowsePage, requiredPermission: "KANJI_DECK_READ" },
  { path: "/kanji-study/kanji/:id", component: KanjiDetailPage, requiredPermission: "KANJI_DETAIL_READ" },
  { path: "/kanji-study/radicals", component: KanjiRadicalListPage, requiredPermission: "KANJI_RADICAL_READ" },
  { path: "/kanji-study/reading", component: KanjiReadingSetListPage, requiredPermission: "KANJI_READING_SET_READ" },
  { path: "/kanji-study/review", component: KanjiReviewPage, requiredPermission: "KANJI_PROGRESS_READ" },
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
  { path: "/translator", component: AnalyzePage },
  { path: "/sentence_practice", component: ProductionPage },
  { path: "/production/review", component: ReviewPage, requiredPermission: "SCENARIO_STUB_UPDATE" },

  // ── Grammar Learning (SRS) ──
  // /grammar is the learner home (DB-driven menu via @ResourceMenu on
  // GrammarDashboardController). The rest are reached by navigation.
  { path: "/grammar", component: GrammarDashboardPage, isModuleDriven: true },
  { path: "/grammar/learn", component: GrammarSessionPage, requiredPermission: "GRAMMAR_PROGRESS_READ" },
  { path: "/grammar/levels/:level", component: GrammarLevelPage, requiredPermission: "GRAMMAR_PROGRESS_READ" },
  { path: "/grammar/detail/:subUseId", component: GrammarDetailPage, requiredPermission: "GRAMMAR_PROGRESS_READ" },

  { path: "/not-found-page", component: NotFoundPage, isPublic: true },
  { path: "/login", component: LoginRouteRedirect, isPublic: true },
  { path: "/logout", component: Logout, isPublic: true },
  { path: "/register", component: RegisterRouteRedirect, isPublic: true },
  { path: "/check-email", component: CheckYourEmailPage, isPublic: true },
  { path: "/forgot-password", component: ForgotPasswordPage, isPublic: true },
  { path: "/oauth2/redirect", component: OAuth2RedirectHandler, isPublic: true,},
  { path: "/unauthorized", component: Unauthorized, isPublic: true },
];
