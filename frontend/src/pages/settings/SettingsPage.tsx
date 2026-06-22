import { Palette } from "lucide-react";

import { MainLayout } from "@/components/layout/MainLayout";
import { InfoCard } from "@/components/common/InfoCard";

/**
 * Settings page — `/settings`.
 *
 * The app now uses a single, fixed light-only "Sakura" theme, so the old
 * customization controls (color presets, typography, light/dark toggle) were
 * removed. The route is kept so the "Cài đặt" link in the user menu still
 * resolves; add new preferences here as the app grows.
 */
export default function SettingsPage() {
    return (
        <MainLayout pathName={{ "/settings": "Cài đặt" }}>
            <div className="w-full flex flex-col gap-3">
                <InfoCard
                    icon={<Palette size={16} className="text-primary" />}
                    title="Giao diện"
                    info="Ứng dụng dùng một bộ giao diện Sakura cố định."
                >
                    <p className="text-sm text-muted-foreground">
                        Giao diện được đặt sẵn theo tông màu Sakura và không thể
                        tùy chỉnh. Các tùy chọn màu sắc, kiểu chữ và chế độ
                        sáng/tối đã được gỡ bỏ.
                    </p>
                </InfoCard>
            </div>
        </MainLayout>
    );
}
