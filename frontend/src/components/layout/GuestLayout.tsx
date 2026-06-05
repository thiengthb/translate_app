interface GuestLayoutProps {
    children: React.ReactNode;
}

/**
 * Bare full-bleed shell for **unauthenticated visitors only**. The header
 * and footer banners were removed so the landing hero can fill the whole
 * viewport edge-to-edge. Authenticated users (admin, student, teacher) get
 * the sidebar shell via `AppShell` in MainLayout — they don't use this.
 */
export function GuestLayout({ children }: GuestLayoutProps) {
    return (
        <div className="min-h-screen flex flex-col bg-background">
            <main className="flex-1 flex flex-col">{children}</main>
        </div>
    );
}
