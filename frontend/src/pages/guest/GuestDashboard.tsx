import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import {
    CalendarCheck,
    CheckSquare,
    Flame,
    Lock,
    Trophy,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

/**
 * Overlay that blurs its children and floats a "Đăng nhập để xem thêm" CTA on
 * top — used to gate the personal-progress widgets a guest can't see yet.
 */
function GatedOverlay({
    children,
    message,
}: {
    children: ReactNode;
    message: string;
}) {
    return (
        <div className="relative">
            <div className="pointer-events-none select-none blur-[3px] opacity-70" aria-hidden>
                {children}
            </div>
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-[24px] bg-white/55 px-4 text-center backdrop-blur-[1px]">
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#FFE5EC] text-[#FF6B9D]">
                    <Lock className="h-5 w-5" />
                </span>
                <p className="max-w-[280px] text-sm font-medium text-[#3A2E33]">{message}</p>
                <Button asChild size="sm">
                    <Link to="/login">Đăng nhập để xem thêm</Link>
                </Button>
            </div>
        </div>
    );
}

function TeaserMissionCard({
    className: sectionName,
    title,
    description,
    cardBg,
    cardBorder,
}: {
    className: string;
    title: string;
    description: string;
    cardBg: string;
    cardBorder: string;
}) {
    return (
        <div
            className="min-w-0 flex-1 rounded-[22px] p-4 pb-[18px]"
            style={{ background: cardBg, border: `1.5px solid ${cardBorder}` }}
        >
            <div className="mb-[14px] font-display text-[18px] font-bold text-[#3A2E33]">
                {sectionName}
            </div>
            <div className="rounded-2xl bg-white p-4 shadow-[0_4px_12px_rgba(58,46,51,0.06)]">
                <h4 className="font-display mb-[6px] text-[17px] font-bold tracking-[0.5px]">
                    {title}
                </h4>
                <p className="m-0 text-[12.5px] leading-[1.5] text-[#9A8E92]">{description}</p>
                <div className="mt-4 h-[6px] overflow-hidden rounded-full bg-[#FFE5EC]">
                    <div className="h-full w-1/3 rounded-full bg-[#FFC2D4]" />
                </div>
            </div>
        </div>
    );
}

function GuestStat({
    icon,
    label,
    color,
}: {
    icon: ReactNode;
    label: string;
    color: string;
}) {
    return (
        <div className="flex flex-1 flex-col items-center gap-1 rounded-[16px] bg-[#FFF7F9] px-2 py-3">
            <span style={{ color }}>{icon}</span>
            <span className="font-display text-[22px] font-bold leading-none text-[#3A2E33]">
                —
            </span>
            <span className="text-center text-[11px] font-medium leading-tight text-[#9A8E92]">
                {label}
            </span>
        </div>
    );
}

/**
 * Guest home — visually the Sakura study dashboard, but every personal-data
 * region (missions, streak calendar, achievement) is gated behind a
 * "Đăng nhập để xem thêm" overlay. The lookup tools stay fully usable via the
 * sidebar; this page is the welcome / conversion surface.
 */
export function GuestDashboard() {
    return (
        <div className="flex flex-col gap-8 xl:flex-row">
            {/* Main column */}
            <div className="flex min-w-0 flex-1 flex-col gap-7">
                {/* Hero */}
                <div
                    className="relative flex flex-col items-center gap-6 overflow-hidden rounded-[24px] border border-[#FBEAF0] px-6 py-6 shadow-[0_8px_24px_rgba(255,143,171,0.10)] sm:flex-row sm:px-9"
                    style={{ background: "linear-gradient(120deg,#FFF0F4 0%,#FFFFFF 60%)" }}
                >
                    <div className="absolute left-[64px] top-[120px] text-[20px] leading-none text-[#FFC95C]">
                        ✦
                    </div>
                    <div className="flex w-full max-w-[180px] flex-none items-end justify-center sm:w-[180px]">
                        <img
                            src="/hanabun-girl.png"
                            alt=""
                            className="h-[160px] w-[160px] max-w-full object-contain"
                        />
                    </div>
                    <div className="relative z-10 min-w-0 flex-1">
                        <h2 className="font-display m-0 mb-[10px] text-[26px] font-semibold leading-[1.15] tracking-[0.5px] text-[#3A2E33] sm:text-[32px]">
                            Học tiếng Nhật cùng{" "}
                            <span className="text-[#FF6B9D]">Hanabun</span>
                        </h2>
                        <p className="m-0 mb-4 text-[16px] font-medium text-[#9A8E92]">
                            Tra từ, Kanji, phân tích câu và dịch thuật — miễn phí, không cần
                            đăng nhập. Đăng nhập để lưu tiến độ, flashcard và giữ chuỗi streak.
                        </p>
                        <div className="flex flex-wrap gap-2">
                            <Button asChild>
                                <Link to="/login">Đăng nhập</Link>
                            </Button>
                            <Button asChild variant="outline">
                                <Link to="/register">Đăng ký miễn phí</Link>
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Missions header */}
                <div>
                    <div className="mb-[18px] flex items-center gap-[10px]">
                        <span className="flex h-[30px] w-[30px] items-center justify-center rounded-[9px] bg-[#FFE5EC] text-[#FF6B9D]">
                            <CheckSquare className="h-[19px] w-[19px]" />
                        </span>
                        <h3 className="font-display m-0 text-[22px] font-bold">Nhiệm vụ</h3>
                    </div>

                    <GatedOverlay message="Đăng nhập để nhận nhiệm vụ hằng ngày và theo dõi tiến độ học của bạn.">
                        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                            <TeaserMissionCard
                                className="Hằng ngày"
                                title="ĐIỂM DANH"
                                description="Ghé Hanabun mỗi ngày để giữ chuỗi streak của bạn cháy mãi."
                                cardBg="#EAFBF3"
                                cardBorder="#BDEBD8"
                            />
                            <TeaserMissionCard
                                className="Tuần này"
                                title="HỌC ĐỀU 7 NGÀY"
                                description="Duy trì thói quen — mỗi ngày ghé học một chút là đủ."
                                cardBg="#FFE5EC"
                                cardBorder="#FF8FAB"
                            />
                            <TeaserMissionCard
                                className="Cấp độ"
                                title="LEVEL 1"
                                description="Tích luỹ EXP từ việc học để mở khoá cấp độ tiếp theo."
                                cardBg="#FFF6E2"
                                cardBorder="#FFE2A8"
                            />
                        </div>
                    </GatedOverlay>
                </div>
            </div>

            {/* Side column — gated streak + achievement */}
            <div className="flex w-full flex-none flex-col gap-6 xl:w-[380px]">
                <GatedOverlay message="Đăng nhập để xem lịch học tập và chuỗi streak của bạn.">
                    <Card className="rounded-[24px] border-0 bg-white px-6 py-[22px] shadow-[0_12px_30px_rgba(255,143,171,0.14)]">
                        <h3 className="font-display mb-4 text-[20px] font-bold">Lịch học tập</h3>
                        <div className="mb-4 flex items-stretch gap-2">
                            <GuestStat
                                icon={<Flame className="h-[18px] w-[18px]" />}
                                label="Chuỗi hiện tại"
                                color="#FF6B9D"
                            />
                            <GuestStat
                                icon={<Trophy className="h-[18px] w-[18px]" />}
                                label="Chuỗi dài nhất"
                                color="#E0A02E"
                            />
                            <GuestStat
                                icon={<CalendarCheck className="h-[18px] w-[18px]" />}
                                label="Tổng ngày học"
                                color="#5FB593"
                            />
                        </div>
                        <div className="grid grid-cols-7 gap-1.5">
                            {Array.from({ length: 28 }, (_, i) => (
                                <div
                                    key={i}
                                    className="aspect-square rounded-full bg-[#FFF0F4]"
                                />
                            ))}
                        </div>
                    </Card>
                </GatedOverlay>

                <GatedOverlay message="Đăng nhập để xem biểu đồ EXP và thành tích tuần này.">
                    <Card className="rounded-[24px] border border-[#FBEAF0] bg-white px-6 py-[22px]">
                        <h3 className="font-display mb-1 text-[20px] font-bold">Thành tích</h3>
                        <p className="mb-4 text-[13px] text-[#9A8E92]">
                            EXP nhận được từng ngày — cố lên nhé~
                        </p>
                        <div className="h-32 rounded-2xl bg-gradient-to-b from-[#FFE5EC] to-white" />
                    </Card>
                </GatedOverlay>
            </div>
        </div>
    );
}
