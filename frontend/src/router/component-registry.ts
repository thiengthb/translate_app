import { Logout } from "@/components/auth/Logout";
import { OAuth2RedirectHandler } from "@/components/auth/OAuth2RedirectHandler";
import ForgotPasswordPage from "@/pages/auth/ForgotPasswordPage";
import { Login } from "@/pages/auth/Login";
import RegisterPage from "@/pages/auth/RegisterPage";
import NotFoundPage from "@/pages/error/NotFoundPage";
import { Unauthorized } from "@/pages/error/Unauthorized";
import { Dashboard } from "@/pages/management/dashboard";
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

  { path: "/not-found-page", component: NotFoundPage, isPublic: true },
  { path: "/login", component: Login, isPublic: true },
  { path: "/logout", component: Logout, isPublic: true },
  { path: "/register", component: RegisterPage, isPublic: true },
  { path: "/forgot-password", component: ForgotPasswordPage, isPublic: true },
  { path: "/oauth2/redirect", component: OAuth2RedirectHandler, isPublic: true,},
  { path: "/unauthorized", component: Unauthorized, isPublic: true },
];
