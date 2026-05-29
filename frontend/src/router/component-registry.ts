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
import LibraryPage from "@/pages/student/LibraryPage";
import CommunityPage from "@/pages/student/CommunityPage";
import DeckPreviewPage from "@/pages/student/DeckPreviewPage";
import CreateDeckPage from "@/pages/student/CreateDeckPage";
import CreateQuizletDeckPage from "@/pages/student/CreateQuizletDeckPage";
import CreateAnkiDeckPage from "@/pages/student/CreateAnkiDeckPage";
import FlashcardStudyPage from "@/pages/student/FlashcardStudyPage";
import AnkiStudyPage from "@/pages/student/AnkiStudyPage";
import TeacherLandingPage from "@/pages/teacher/TeacherLandingPage";
import ProfilePage from "@/pages/profile/ProfilePage";
import SettingsPage from "@/pages/settings/SettingsPage";
import StreakPage from "@/pages/streak/StreakPage";
import UsersPage from "@/pages/management/rbac/user/UsersPage";
import LeaderboardPage from "@/pages/leaderboard/LeaderboardPage";
import PublicProfilePage from "@/pages/publicProfile/PublicProfilePage";
import AnalyzePage from "@/pages/analyze/AnalyzePage";
import ProductionPage from "@/pages/production/ProductionPage";
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
  { path: "/student", component: StudentLandingPage, requiredPermission: "BOOK_READ" },
  { path: "/library", component: LibraryPage, isModuleDriven: true },
  { path: "/community", component: CommunityPage, isModuleDriven: true },
  { path: "/deck/:deckId/preview", component: DeckPreviewPage, requiredPermission: "DECK_READ" },
  { path: "/create-deck", component: CreateDeckPage, requiredPermission: "DECK_CREATE" },
  { path: "/create-deck/quizlet", component: CreateQuizletDeckPage, requiredPermission: "DECK_CREATE" },
  { path: "/create-deck/anki", component: CreateAnkiDeckPage, requiredPermission: "DECK_CREATE" },
  { path: "/deck/:deckId", component: FlashcardStudyPage, requiredPermission: "DECK_READ" },
  { path: "/deck/:deckId/anki", component: AnkiStudyPage, requiredPermission: "ANKI_SRS_PROGRESS_READ" },
  { path: "/teacher", component: TeacherLandingPage, requiredPermission: "BOOK_UPDATE" },
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
