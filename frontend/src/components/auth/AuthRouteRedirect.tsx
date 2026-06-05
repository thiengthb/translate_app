import { Navigate, useSearchParams } from "react-router-dom";

/**
 * The standalone /login and /register pages were replaced by a global
 * liquid-glass modal opened from the landing page. These tiny redirects keep
 * the old URLs (and OAuth's `/login?error=...` callback) working: they bounce
 * to the landing route with an `?auth=` flag that LandingPage reads to auto-open
 * the modal on the right tab.
 */
export function LoginRouteRedirect() {
    const [sp] = useSearchParams();
    const error = sp.get("error");
    const target = error
        ? `/?auth=login&error=${encodeURIComponent(error)}`
        : "/?auth=login";
    return <Navigate to={target} replace />;
}

export function RegisterRouteRedirect() {
    return <Navigate to="/?auth=register" replace />;
}
