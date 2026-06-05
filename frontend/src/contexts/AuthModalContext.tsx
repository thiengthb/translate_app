import { createContext, useCallback, useContext, useMemo, useState } from "react";

import { AuthModal, type AuthMode } from "@/components/auth/AuthModal";

interface AuthModalApi {
    /** Open the modal on the login tab. Optionally pre-fill an error banner. */
    openLogin: (opts?: { error?: string }) => void;
    /** Open the modal on the register tab. Optionally pre-fill the email field. */
    openRegister: (opts?: { email?: string }) => void;
    /** Close the modal. */
    close: () => void;
}

const AuthModalContext = createContext<AuthModalApi | null>(null);

/**
 * Hosts the single global liquid-glass auth modal and exposes imperative
 * open/close handlers. Wrap the app (inside Router + Redux) with this provider;
 * any guest component can then call `useAuthModal().openLogin()` etc.
 */
export function AuthModalProvider({ children }: { children: React.ReactNode }) {
    const [open, setOpen] = useState(false);
    const [mode, setMode] = useState<AuthMode>("login");
    const [initialError, setInitialError] = useState<string | undefined>();
    const [prefillEmail, setPrefillEmail] = useState<string | undefined>();

    const openLogin = useCallback((opts?: { error?: string }) => {
        setMode("login");
        setInitialError(opts?.error);
        setPrefillEmail(undefined);
        setOpen(true);
    }, []);

    const openRegister = useCallback((opts?: { email?: string }) => {
        setMode("register");
        setInitialError(undefined);
        setPrefillEmail(opts?.email);
        setOpen(true);
    }, []);

    const close = useCallback(() => setOpen(false), []);

    const api = useMemo<AuthModalApi>(
        () => ({ openLogin, openRegister, close }),
        [openLogin, openRegister, close],
    );

    return (
        <AuthModalContext.Provider value={api}>
            {children}
            <AuthModal
                open={open}
                mode={mode}
                initialError={initialError}
                defaultEmail={prefillEmail}
                onModeChange={setMode}
                onClose={close}
            />
        </AuthModalContext.Provider>
    );
}

export function useAuthModal(): AuthModalApi {
    const ctx = useContext(AuthModalContext);
    if (!ctx) throw new Error("useAuthModal must be used within an AuthModalProvider");
    return ctx;
}
