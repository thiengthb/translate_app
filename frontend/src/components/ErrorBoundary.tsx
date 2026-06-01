import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, info: ErrorInfo) {
        console.error("ErrorBoundary caught:", error, info.componentStack);
    }

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) return this.props.fallback;

            return (
                <div className="flex h-screen items-center justify-center bg-background">
                    <div className="text-center space-y-4">
                        <h2 className="text-xl font-semibold text-destructive">Đã xảy ra lỗi</h2>
                        <p className="text-muted-foreground text-sm max-w-md">
                            {this.state.error?.message ?? "Lỗi không xác định"}
                        </p>
                        <button
                            className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm"
                            onClick={() => {
                                this.setState({ hasError: false, error: undefined });
                                window.location.reload();
                            }}
                        >
                            Tải lại trang
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}