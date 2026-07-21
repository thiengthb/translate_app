import { Suspense } from "react";
import { useSelector } from "react-redux";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster } from "sonner";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { PersistentAppShell } from "./components/layout/MainLayout";
import { RoleSwitchProvider } from "./contexts/RoleSwitchContext";
import { I18nProvider } from "./contexts/I18nContext";
import { LayoutConfigProvider } from "./contexts/LayoutConfigContext";
import { useAppMeta } from "./hooks/useAppMeta";
import { usePermissions } from "./hooks/usePermissions";
import { useActiveModuleGroups } from "./hooks/useSidebarMenus";
import { usePublicModules } from "./hooks/usePublicModules";
import { NotFoundRedirect } from "./pages/error/NotFoundRedirect";
import GuestToolsPage from "./pages/guest/GuestToolsPage";
import { MetadataDrivenCrudPage } from "./pages/management/MetadataDrivenCrudPage";
import { routes, type RouteComponent } from "./router/component-registry";
import type { RootState } from "./store/store";
import { getHomePathByRole } from "./utils/rbac.utils";

// Stable across renders — `routes` is a module-level constant.
const componentRegistry: Record<string, RouteComponent> = Object.fromEntries(
    routes.filter((r) => r.isModuleDriven).map((r) => [r.path, r.component]),
);
const staticRoutes = routes.filter((r) => !r.isModuleDriven);

/**
 * Paths owned by `staticRoutes` (e.g. `/streak`, `/notifications`,
 * `/audit-logs`). The BE may return a Module row whose URL hits one of
 * these — when it does we let the static route handle it instead of
 * letting the module-driven block shadow it with a 404 redirect
 * (such paths have no entry in `componentRegistry` by design).
 */
const staticRoutePaths = new Set(staticRoutes.map((r) => r.path));

function RouteContent({ Component }: { Component: RouteComponent }) {
    return (
        <Suspense
            fallback={
                <div className="flex min-h-[240px] flex-1 items-center justify-center text-sm text-muted-foreground">
                    Loading...
                </div>
            }
        >
            <Component />
        </Suspense>
    );
}

function AppRoutes() {
    const { isAuthenticated } = useSelector((state: RootState) => state.auth);
    const { activeRole } = usePermissions();
    const { data: moduleGroups = [] } = useActiveModuleGroups(isAuthenticated);
    const { data: publicModules = [] } = usePublicModules();

    // Keep `document.title` in sync with the active route. Mounted here
    // (inside BrowserRouter, alongside the moduleGroups query) so module
    // titles from the BE feed the title resolver directly.
    useAppMeta();

    // Authenticated users go to role home; guests land on the no-login
    // lookup tools (/tra-cuu content) as the first pre-login page. From there
    // the header "Đăng nhập" button routes to the cherry auth screen (/login).
    // The marketing portfolio landing stays reachable at /portfolio.
    const rootElement = isAuthenticated ? (
        <Navigate to={getHomePathByRole(activeRole)} replace />
    ) : (
        <GuestToolsPage />
    );

    // Public module URLs — skipped from protected routes
    const publicModuleUrls = new Set(
        publicModules.filter((m) => !!m.url).map((m) => m.url as string),
    );

    return (
        <Routes>
            <Route path="/" element={rootElement} />

            {/* Public modules — accessible without auth */}
            {publicModules
                .filter((m) => !!m.url)
                .map((m) => {
                    const Component = componentRegistry[m.url!];
                    if (!Component) return null;
                    return (
                        <Route
                            key={`public-${m.id}`}
                            path={m.url!}
                            element={<RouteContent Component={Component} />}
                        />
                    );
                })}

            {/* Public static routes (login, register, about, ...) — no auth,
                no persistent shell; each renders its own complete layout. */}
            {staticRoutes
                .filter((route) => route.isPublic)
                .map((route, index) => (
                    <Route
                        key={`static-public-${index}`}
                        path={route.path}
                        element={<RouteContent Component={route.component} />}
                    />
                ))}

            {/* Everything below requires auth and shares ONE persistent shell
                instance (top brand header incl. WritingQuoteHeader + sidebar)
                via <Outlet/>, mounted once by this layout Route instead of
                per-page — navigating between these routes no longer
                unmounts/remounts the shell (which used to reset
                WritingQuoteHeader's rotating-quote timer on every nav). */}
            <Route
                element={
                    <LayoutConfigProvider>
                        <PersistentAppShell />
                    </LayoutConfigProvider>
                }
            >
                {/* Dynamic routes from backend Module table.
                    Resolution order for each module URL:
                      1. File-based entityConfig in src/pages/management/.../<entity>/index.tsx
                      2. Fallback: MetadataDrivenCrudPage that pulls schema from
                         /api/meta/entities at runtime — lets a BE-only entity
                         (Entity + DTO is enough) appear with full CRUD UI. */}
                {moduleGroups.flatMap((group) =>
                    group.modules.map((m) => {
                        if (!m.url) return null;
                        if (publicModuleUrls.has(m.url)) return null; // already registered above

                        // A static route owns this path — DON'T register a
                        // module-driven Route for it, the static block
                        // below will handle it (otherwise a route with
                        // identical path would shadow ours with a 404
                        // redirect for non-AutoCrud pages like /streak,
                        // /notifications, /audit-logs).
                        if (staticRoutePaths.has(m.url)) return null;

                        const Component = componentRegistry[m.url];

                        // No Component → fall back to metadata-driven CRUD
                        // UI. The BE side ships @AutoCrud + @ResourceMenu
                        // without a matching FE entityConfig (e.g. Tag,
                        // Translation); MetadataDrivenCrudPage builds the
                        // table at runtime from `/api/meta/entities/<Name>`.
                        const element = Component ? (
                            <RouteContent Component={Component} />
                        ) : (
                            <MetadataDrivenCrudPage url={m.url} />
                        );

                        return (
                            <Route
                                key={m.id}
                                path={m.url}
                                element={
                                    <ProtectedRoute requiredPermission={m.requiredPermission}>
                                        {element}
                                    </ProtectedRoute>
                                }
                            />
                        );
                    }),
                )}

                {/* Protected static routes from componentRegistry */}
                {staticRoutes
                    .filter((route) => !route.isPublic)
                    .map((route, index) => (
                        <Route
                            key={`static-protected-${index}`}
                            path={route.path}
                            element={
                                <ProtectedRoute requiredPermission={route.requiredPermission}>
                                    <RouteContent Component={route.component} />
                                </ProtectedRoute>
                            }
                        />
                    ))}
            </Route>

            <Route path="*" element={<NotFoundRedirect />} />
        </Routes>
    );
}

/**
 * Sonner toaster styled to match the Lightswind Alert look: a neutral card
 * surface with a colored border / text / icon per type, instead of sonner's
 * saturated `richColors` fills. `info` borrows the app's `--primary` so
 * toasts track the Sakura accent. The app is light-only now, so the
 * toaster theme is fixed to "light".
 */
function AppToaster() {
    return (
        <Toaster
            theme="light"
            duration={1500}
            position="top-right"
            toastOptions={{
                classNames: {
                    toast: "rounded-lg border p-4 shadow-lg",
                    title: "font-medium tracking-tight",
                    description: "text-sm opacity-90",
                    success:
                        "!border-green-500/50 !text-green-700 dark:!text-green-500 [&_[data-icon]>svg]:!text-green-500",
                    error:
                        "!border-gray-400 dark:!border-gray-700/50 !text-red-500 [&_[data-icon]>svg]:!text-red-500",
                    warning:
                        "!border-yellow-500/50 !text-yellow-700 dark:!text-yellow-500 [&_[data-icon]>svg]:!text-yellow-500",
                    info:
                        "!border-primary/50 !text-blue-700 dark:!text-primary [&_[data-icon]>svg]:!text-primary",
                },
            }}
        />
    );
}

function App() {
    return (
        <ErrorBoundary>
            <BrowserRouter>
                <AppToaster />
                <I18nProvider>
                    <RoleSwitchProvider>
                        <AppRoutes />
                    </RoleSwitchProvider>
                </I18nProvider>
            </BrowserRouter>
        </ErrorBoundary>
    );
}

export default App;
