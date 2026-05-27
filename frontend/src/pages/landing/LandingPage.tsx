import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, Globe, ShieldCheck, Sparkles, Zap } from "lucide-react";

import { GuestLayout } from "@/components/layout/GuestLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { usePublicModules } from "@/hooks/usePublicModules";
import { iconMap } from "@/components/datatable/iconMap";

function resolveIcon(name?: string) {
    const key: keyof typeof iconMap =
        name && name in iconMap ? (name as keyof typeof iconMap) : "menu";
    return iconMap[key];
}

const HIGHLIGHTS = [
    {
        icon: ShieldCheck,
        title: "Phân quyền linh hoạt",
        description: "Quản lý role, permission và module dễ dàng theo nhu cầu thực tế.",
    },
    {
        icon: Zap,
        title: "Hiệu năng cao",
        description: "Spring Boot + React + Tailwind, tối ưu cho production.",
    },
    {
        icon: Globe,
        title: "Đa người dùng",
        description: "Hỗ trợ ADMIN, TEACHER, STUDENT và mở rộng dễ dàng.",
    },
];

export default function LandingPage() {
    const navigate = useNavigate();
    const { data: publicModules = [], isLoading } = usePublicModules();

    return (
        <GuestLayout>
            {/* ─── HERO ─────────────────────────────────────────────────────── */}
            <section className="relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-background" />
                <div className="absolute -top-24 -right-24 h-96 w-96 rounded-full bg-primary/20 blur-3xl" />
                <div className="absolute -bottom-24 -left-24 h-96 w-96 rounded-full bg-primary/10 blur-3xl" />

                <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20 sm:py-28">
                    <div className="max-w-3xl">
                        <Badge variant="secondary" className="gap-1.5 mb-5">
                            <Sparkles size={12} className="text-primary" />
                            Hệ thống RBAC hoàn chỉnh
                        </Badge>
                        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-foreground leading-tight">
                            Quản lý người dùng &<br />
                            phân quyền{" "}
                            <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                                thông minh
                            </span>
                        </h1>
                        <p className="mt-6 text-lg text-muted-foreground max-w-2xl">
                            Một nền tảng RBAC end-to-end cho phép bạn xây dựng, quản lý và mở rộng
                            hệ thống quyền hạn của tổ chức một cách dễ dàng.
                        </p>
                        <div className="mt-8 flex flex-wrap gap-3">
                            <Button size="lg" onClick={() => navigate("/register")} className="gap-2">
                                Bắt đầu miễn phí
                                <ArrowRight size={16} />
                            </Button>
                            <Button
                                size="lg"
                                variant="outline"
                                onClick={() => navigate("/login")}
                            >
                                Đăng nhập
                            </Button>
                        </div>
                    </div>
                </div>
            </section>

            {/* ─── HIGHLIGHTS ───────────────────────────────────────────────── */}
            <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {HIGHLIGHTS.map((h) => (
                        <div
                            key={h.title}
                            className="flex flex-col gap-3 p-6 rounded-2xl border bg-card hover:shadow-md transition-shadow"
                        >
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                <h.icon size={20} />
                            </div>
                            <h3 className="font-semibold text-foreground">{h.title}</h3>
                            <p className="text-sm text-muted-foreground leading-relaxed">
                                {h.description}
                            </p>
                        </div>
                    ))}
                </div>
            </section>

            {/* ─── PUBLIC FEATURES ──────────────────────────────────────────── */}
            <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
                <div className="flex flex-col items-center text-center mb-12">
                    <Badge variant="secondary" className="mb-3">
                        Khám phá ngay
                    </Badge>
                    <h2 className="text-3xl sm:text-4xl font-bold text-foreground">
                        Tính năng công khai
                    </h2>
                    <p className="mt-3 text-muted-foreground max-w-2xl">
                        Trải nghiệm các tính năng được mở mà không cần đăng nhập. Đăng ký để mở
                        khóa toàn bộ hệ thống.
                    </p>
                </div>

                {isLoading ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                        {Array.from({ length: 3 }).map((_, i) => (
                            <div key={i} className="h-44 rounded-2xl bg-muted/60 animate-pulse" />
                        ))}
                    </div>
                ) : publicModules.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                        Chưa có tính năng công khai nào.
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                        {publicModules
                            .filter((m) => !!m.url)
                            .map((m) => {
                                const Icon = resolveIcon(m.icon);
                                return (
                                    <Link
                                        key={m.id}
                                        to={m.url!}
                                        className="group block"
                                    >
                                        <Card className="h-full hover:border-primary/40 hover:shadow-lg transition-all">
                                            <CardHeader>
                                                <div className="flex items-start justify-between gap-3">
                                                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                                                        <Icon size={22} />
                                                    </div>
                                                    <ArrowRight
                                                        size={16}
                                                        className="text-muted-foreground group-hover:translate-x-1 group-hover:text-primary transition-all"
                                                    />
                                                </div>
                                                <CardTitle className="mt-3 text-lg">
                                                    {m.title}
                                                </CardTitle>
                                                {m.description && (
                                                    <CardDescription className="line-clamp-2">
                                                        {m.description}
                                                    </CardDescription>
                                                )}
                                            </CardHeader>
                                            <CardContent>
                                                <span className="text-xs text-primary font-medium inline-flex items-center gap-1">
                                                    Khám phá
                                                    <ArrowRight size={11} />
                                                </span>
                                            </CardContent>
                                        </Card>
                                    </Link>
                                );
                            })}
                    </div>
                )}
            </section>

            {/* ─── CTA ──────────────────────────────────────────────────────── */}
            <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-20">
                <div className="rounded-3xl bg-gradient-to-br from-primary to-primary/70 p-8 sm:p-12 text-primary-foreground relative overflow-hidden">
                    <div className="absolute top-0 right-0 h-64 w-64 rounded-full bg-white/10 blur-3xl -translate-y-1/2 translate-x-1/2" />
                    <div className="relative max-w-2xl">
                        <h2 className="text-3xl sm:text-4xl font-bold">
                            Sẵn sàng bắt đầu?
                        </h2>
                        <p className="mt-3 text-primary-foreground/90 text-lg">
                            Tạo tài khoản miễn phí và trải nghiệm toàn bộ hệ thống.
                        </p>
                        <div className="mt-6 flex flex-wrap gap-3">
                            <Button
                                size="lg"
                                variant="secondary"
                                onClick={() => navigate("/register")}
                                className="gap-2"
                            >
                                Đăng ký miễn phí
                                <ArrowRight size={16} />
                            </Button>
                            <Button
                                size="lg"
                                variant="outline"
                                className="bg-transparent border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
                                onClick={() => navigate("/login")}
                            >
                                Đăng nhập
                            </Button>
                        </div>
                    </div>
                </div>
            </section>
        </GuestLayout>
    );
}
