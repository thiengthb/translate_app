import { useMemo } from "react";
import { useSelector } from "react-redux";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster } from "sonner";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { RoleSwitchProvider } from "./contexts/RoleSwitchContext";
import { I18nProvider } from "./contexts/I18nContext";
import { usePermissions } from "./hooks/usePermissions";
import { useActiveModuleGroups } from "./hooks/useSidebarMenus";
import { NotFoundRedirect } from "./pages/error/NotFoundRedirect";
import { MetadataDrivenCrudPage } from "./pages/management/MetadataDrivenCrudPage";
import { routes } from "./router/component-registry";
import type { RootState } from "./store/store";
import { getHomePathByRole } from "./utils/rbac.utils";

// Stable across renders — `routes` is a module-level constant.
const componentRegistry: Record<string, React.ComponentType> = Object.fromEntries(
    routes.filter((r) => r.isModuleDriven).map((r) => [r.path, r.component]),
);
const staticRoutes = routes.filter((r) => !r.isModuleDriven);

function AppRoutes() {
    const { isAuthenticated } = useSelector((state: RootState) => state.auth);
    const { activeRole } = usePermissions();
    const { data: moduleGroups = [] } = useActiveModuleGroups(isAuthenticated);

    const homePath = useMemo(
        () => (isAuthenticated ? getHomePathByRole(activeRole) : "/login"),
        [isAuthenticated, activeRole],
    );

    return (
        <Routes>
            {/* Root redirect */}
            <Route path="/" element={<Navigate to={homePath} replace />} />

            {/* Dynamic routes from backend Module table.
                Resolution order for each module URL:
                  1. File-based entityConfig in src/pages/management/.../<entity>/index.tsx
                  2. Fallback: MetadataDrivenCrudPage that pulls schema from
                     /api/meta/entities at runtime — lets a BE-only entity
                     (Entity + DTO is enough) appear with full CRUD UI. */}
            {moduleGroups.flatMap((group) =>
                group.modules.map((m) => {
                    if (!m.url) return null;
                    const Component = componentRegistry[m.url];

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

            {/* Catch all */}
            <Route path="*" element={<NotFoundRedirect />} />
        </Routes>
    );
}

function App() {
    return (
        <ErrorBoundary>
            <BrowserRouter>
                <Toaster
                    duration={1500}
                    position="top-right"
                    richColors
                    toastOptions={{
                        className: "p-4",
                    }}
                />
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
