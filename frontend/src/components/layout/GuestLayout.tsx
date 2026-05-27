import { Link, useLocation, useNavigate } from "react-router-dom";
import { ArrowRight, LogIn } from "lucide-react";

import { Button } from "@/components/ui/button";
import ToggleTheme from "@/components/ToggleTheme";
import { usePublicModules } from "@/hooks/usePublicModules";
import { iconMap } from "@/components/datatable/iconMap";

function resolveIcon(name?: string) {
    const key: keyof typeof iconMap =
        name && name in iconMap ? (name as keyof typeof iconMap) : "menu";
    return iconMap[key];
}

export function GuestLayout({ children }: { children: React.ReactNode }) {
    const navigate = useNavigate();
    const location = useLocation();
    const { data: publicModules = [] } = usePublicModules();

    return (
        <div className="min-h-screen flex flex-col bg-background">
            <header className="sticky top-0 z-40 w-full border-b bg-background/80 backdrop-blur-xl">
                <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6 lg:px-8">
                    {/* Logo */}
                    <Link to="/" className="flex items-center gap-2.5 shrink-0">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground shadow-sm">
                            R
                        </div>
                        <span className="text-base font-semibold text-foreground hidden sm:inline-block">
                            RBAC System
                        </span>
                    </Link>

                    {/* Public nav */}
                    <nav className="hidden md:flex items-center gap-1 ml-2">
                        {publicModules
                            .filter((m) => !!m.url)
                            .map((m) => {
                                const Icon = resolveIcon(m.icon);
                                const isActive =
                                    location.pathname === m.url ||
                                    location.pathname.startsWith(`${m.url}/`);
                                return (
                                    <Link
                                        key={m.id}
                                        to={m.url!}
                                        className={`flex items-center gap-1.5 h-9 px-3 rounded-md text-sm font-medium transition-colors ${
                                            isActive
                                                ? "text-primary bg-primary/10"
                                                : "text-muted-foreground hover:text-foreground hover:bg-accent/70"
                                        }`}
                                    >
                                        <Icon className="h-4 w-4" />
                                        <span>{m.title}</span>
                                    </Link>
                                );
                            })}
                    </nav>

                    <div className="flex-1" />

                    {/* Right side */}
                    <div className="flex items-center gap-2">
                        <ToggleTheme />
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate("/login")}
                            className="gap-1.5"
                        >
                            <LogIn size={15} />
                            <span className="hidden sm:inline">Đăng nhập</span>
                        </Button>
                        <Button
                            size="sm"
                            onClick={() => navigate("/register")}
                            className="gap-1.5"
                        >
                            <span>Đăng ký</span>
                            <ArrowRight size={15} />
                        </Button>
                    </div>
                </div>
            </header>

            <main className="flex-1 flex flex-col">{children}</main>

            <footer className="border-t bg-muted/30 py-6">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2 text-sm text-muted-foreground">
                    <span>© {new Date().getFullYear()} RBAC System</span>
                    <span className="text-xs">Powered by Spring Boot + React</span>
                </div>
            </footer>
        </div>
    );
}
