import { useSelector } from "react-redux";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster } from "sonner";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { AuthProvider } from "./contexts/AuthContext";
import { RoleSwitchProvider } from "./contexts/RoleSwitchContext";
import { I18nProvider } from "./contexts/I18nContext";
import { usePermissions } from "./hooks/usePermissions";
import { useActiveModuleGroups } from "./hooks/useSidebarMenus";
import { usePublicModules } from "./hooks/usePublicModules";
import { NotFoundRedirect } from "./pages/error/NotFoundRedirect";
import LandingPage from "./pages/landing/LandingPage";
import { routes } from "./router/component-registry";
import type { RootState } from "./store/store";
import { getHomePathByRole } from "./utils/rbac.utils";

function AppRoutes() {
    const { isAuthenticated } = useSelector((state: RootState) => state.auth);
    const { activeRole } = usePermissions();
    const { data: moduleGroups = [] } = useActiveModuleGroups(isAuthenticated);
    const { data: publicModules = [] } = usePublicModules();

    // Authenticated users go to role home, guests stay on landing page
    const rootElement = isAuthenticated ? (
        <Navigate to={getHomePathByRole(activeRole)} replace />
    ) : (
        <LandingPage />
    );

    const componentRegistry = Object.fromEntries(
        routes.filter((r) => r.isModuleDriven).map((r) => [r.path, r.component]),
    );

    const staticRoutes = routes.filter((r) => !r.isModuleDriven);

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
            {moduleGroups.flatMap((group) =>
                group.modules.map((m) => {
                    if (!m.url) return null;
                    if (publicModuleUrls.has(m.url)) return null; // already registered above
                    const Component = componentRegistry[m.url];

                    if (!Component) {
                        return (
                            <Route
                                key={`missing-${m.id ?? m.url}`}
                                path={m.url}
                                element={<Navigate to="/not-found-page" replace />}
                            />
                        );
                    }

                    return (
                        <Route
                            key={m.id}
                            path={m.url}
                            element={
                                <ProtectedRoute requiredPermission={m.requiredPermission}>
                                    <Component />
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

function App() {
    return (
        <BrowserRouter>
            <Toaster
                duration={1500}
                position="top-right"
                richColors
                toastOptions={{ className: "p-4" }}
            />
            <AuthProvider>
                <I18nProvider>
                    <RoleSwitchProvider>
                        <AppRoutes />
                    </RoleSwitchProvider>
                </I18nProvider>
            </AuthProvider>
        </BrowserRouter>
    );
}

export default App;
