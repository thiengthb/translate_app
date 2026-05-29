import { Logout } from "@/components/auth/Logout";
import { OAuth2RedirectHandler } from "@/components/auth/OAuth2RedirectHandler";
import CheckYourEmailPage from "@/pages/auth/CheckYourEmailPage";
import ForgotPasswordPage from "@/pages/auth/ForgotPasswordPage";
import { Login } from "@/pages/auth/Login";
import RegisterPage from "@/pages/auth/RegisterPage";
import NotFoundPage from "@/pages/error/NotFoundPage";
import { Unauthorized } from "@/pages/error/Unauthorized";
import { Dashboard } from "@/pages/management/dashboard";
import KeyboardShortcutsPage from "@/pages/help/KeyboardShortcutsPage";
import StudentLandingPage from "@/pages/student/StudentLandingPage";
import TeacherLandingPage from "@/pages/teacher/TeacherLandingPage";
import ProfilePage from "@/pages/profile/ProfilePage";
import StreakPage from "@/pages/streak/StreakPage";
import UserDashboardPage from "@/pages/admin/userDashboard/UserDashboardPage";
import LeaderboardPage from "@/pages/leaderboard/LeaderboardPage";
import PublicProfilePage from "@/pages/publicProfile/PublicProfilePage";
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
  { path: "/teacher", component: TeacherLandingPage, requiredPermission: "BOOK_UPDATE" },
  ...buildEntityRoutes(),
  { path: "/profile", component: ProfilePage },
  { path: "/streak", component: StreakPage },
  { path: "/help/shortcuts", component: KeyboardShortcutsPage },
  { path: "/admin/users-dashboard", component: UserDashboardPage, isModuleDriven: true },
  { path: "/leaderboard", component: LeaderboardPage, isModuleDriven: true },
  { path: "/users/:userId", component: PublicProfilePage },

  { path: "/not-found-page", component: NotFoundPage, isPublic: true },
  { path: "/login", component: Login, isPublic: true },
  { path: "/logout", component: Logout, isPublic: true },
  { path: "/register", component: RegisterPage, isPublic: true },
  { path: "/check-email", component: CheckYourEmailPage, isPublic: true },
  { path: "/forgot-password", component: ForgotPasswordPage, isPublic: true },
  { path: "/oauth2/redirect", component: OAuth2RedirectHandler, isPublic: true,},
  { path: "/unauthorized", component: Unauthorized, isPublic: true },
];
