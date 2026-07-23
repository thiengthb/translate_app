import { createContext, useCallback, useContext, useMemo } from "react";
import { useNavigate } from "react-router-dom";

interface AuthModalApi {
    /** Navigate to the login screen (the cherry-blossom landing page). Optionally
     *  carries an error message through as a query param (e.g. OAuth failure). */
    openLogin: (opts?: { error?: string }) => void;
    /** Navigate to the register screen (same landing page, register tab). */
    openRegister: (opts?: { email?: string }) => void;
    /** No-op — kept for API compatibility with callers that used to close an
     *  in-place modal. Navigating away naturally "closes" the prompt now. */
    close: () => void;
}

const AuthModalContext = createContext<AuthModalApi | null>(null);

/**
 * Every guest-facing "sign in to continue" trigger (locked widgets, the
 * sidebar's Đăng nhập/Đăng ký pair, the notebook save gate…) calls
 * `useAuthModal().openLogin()` / `openRegister()`. This used to pop an in-place
 * dialog; per product feedback it now simply navigates to the dedicated
 * landing page (`/login` / `/register`), which already has its own polished
 * cherry-blossom login/register form — one login experience instead of two.
 */
export function AuthModalProvider({ children }: { children: React.ReactNode }) {
    const navigate = useNavigate();

    const openLogin = useCallback(
        (opts?: { error?: string }) => {
            navigate(opts?.error ? `/login?error=${encodeURIComponent(opts.error)}` : "/login");
        },
        [navigate],
    );

    const openRegister = useCallback(() => {
        navigate("/register");
    }, [navigate]);

    const close = useCallback(() => {}, []);

    const api = useMemo<AuthModalApi>(
        () => ({ openLogin, openRegister, close }),
        [openLogin, openRegister, close],
    );

    return <AuthModalContext.Provider value={api}>{children}</AuthModalContext.Provider>;
}

export function useAuthModal(): AuthModalApi {
    const ctx = useContext(AuthModalContext);
    if (!ctx) throw new Error("useAuthModal must be used within an AuthModalProvider");
    return ctx;
}
