import { useSelector } from "react-redux";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster } from "sonner";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { RoleSwitchProvider } from "./contexts/RoleSwitchContext";
import { I18nProvider } from "./contexts/I18nContext";
import { AuthModalProvider } from "./contexts/AuthModalContext";
import { useAppMeta } from "./hooks/useAppMeta";
import { usePermissions } from "./hooks/usePermissions";
import { useActiveModuleGroups } from "./hooks/useSidebarMenus";
import { usePublicModules } from "./hooks/usePublicModules";
import { useThemePreference } from "./hooks/useThemePreference";
import { NotFoundRedirect } from "./pages/error/NotFoundRedirect";
import LandingPage from "./pages/landing/LandingPage";
import { MetadataDrivenCrudPage } from "./pages/management/MetadataDrivenCrudPage";
import { routes } from "./router/component-registry";
import type { RootState } from "./store/store";
import { getHomePathByRole } from "./utils/rbac.utils";

// Stable across renders — `routes` is a module-level constant.
const componentRegistry: Record<string, React.ComponentType> = Object.fromEntries(
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

function AppRoutes() {
    const { isAuthenticated } = useSelector((state: RootState) => state.auth);
    const { activeRole } = usePermissions();
    const { data: moduleGroups = [] } = useActiveModuleGroups(isAuthenticated);
    const { data: publicModules = [] } = usePublicModules();

    // Keep `document.title` in sync with the active route. Mounted here
    // (inside BrowserRouter, alongside the moduleGroups query) so module
    // titles from the BE feed the title resolver directly.
    useAppMeta();

    // Authenticated users go to role home, guests stay on landing page
    const rootElement = isAuthenticated ? (
        <Navigate to={getHomePathByRole(activeRole)} replace />
    ) : (
        <LandingPage />
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
                            element={<Component />}
                        />
                    );
                })}

            {/* Authenticated module routes from backend Module table */}
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
                        <Component />
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

            {/* Static routes from componentRegistry */}
            {staticRoutes.map((route, index) => {
                const Component = route.component;

                if (route.isPublic) {
                    return <Route key={index} path={route.path} element={<Component />} />;
                }

                return (
                    <Route
                        key={index}
                        path={route.path}
                        element={
                            <ProtectedRoute requiredPermission={route.requiredPermission}>
                                <Component />
                            </ProtectedRoute>
                        }
                    />
                );
            })}

            <Route path="*" element={<NotFoundRedirect />} />
        </Routes>
    );
}

/**
 * Sonner toaster styled to match the Lightswind Alert look: a neutral card
 * surface with a colored border / text / icon per type, instead of sonner's
 * saturated `richColors` fills. `info` borrows the app's `--primary` so
 * toasts track the chosen color preset, and `theme` follows the app's
 * resolved light/dark so the surface flips with the rest of the UI.
 */
function AppToaster() {
    const { resolvedTheme } = useThemePreference();
    return (
        <Toaster
            theme={resolvedTheme}
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
                        <AuthModalProvider>
                            <AppRoutes />
                        </AuthModalProvider>
                    </RoleSwitchProvider>
                </I18nProvider>
            </BrowserRouter>
        </ErrorBoundary>
    );
}

export default App;
