import { AlertCircle, Database, FilterX, Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";

export type NoResultVariant = "empty" | "filtered" | "error";

interface NoResultProps {
    variant?: NoResultVariant;
    message?: string;
    onAction?: () => void;
    actionLabel?: string;
}

const VARIANTS = {
    empty: {
        icon: Inbox,
        title: "Chưa có dữ liệu",
        description: "Bắt đầu bằng cách tạo bản ghi đầu tiên.",
        defaultAction: "Tạo mới",
    },
    filtered: {
        icon: FilterX,
        title: "Không tìm thấy kết quả",
        description: "Thử điều chỉnh bộ lọc hoặc từ khóa tìm kiếm.",
        defaultAction: "Xóa bộ lọc",
    },
    error: {
        icon: AlertCircle,
        title: "Đã xảy ra lỗi",
        description: "Không thể tải dữ liệu. Vui lòng thử lại.",
        defaultAction: "Thử lại",
    },
} as const;

const NoResult = ({
    variant = "empty",
    message,
    onAction,
    actionLabel,
}: NoResultProps) => {
    const config = VARIANTS[variant];
    const Icon = config.icon ?? Database;

    return (
        <div className="flex flex-col items-center justify-center gap-3 text-muted-foreground py-12 px-4">
            <div
                className={`flex h-14 w-14 items-center justify-center rounded-full ${
                    variant === "error"
                        ? "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                        : "bg-muted text-muted-foreground"
                }`}
            >
                <Icon size={26} />
            </div>
            <div className="text-center max-w-md">
                <p className="text-foreground font-medium">{message ?? config.title}</p>
                <p className="text-sm text-muted-foreground mt-1">{config.description}</p>
            </div>
            {onAction && (
                <Button size="sm" variant={variant === "error" ? "outline" : "default"} onClick={onAction}>
                    {actionLabel ?? config.defaultAction}
                </Button>
            )}
        </div>
    );
};

export default NoResult;
