import { logger } from "@/lib/logger";
import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

/**

 Catches render-phase errors in the entire app so a single misbehaving
 component can't blank the whole screen.*
 Keep this dumb and self-contained — it must NOT depend on Router, Redux
 or anything that itself can throw at render.*/
export class ErrorBoundary extends Component<Props, State> {
    state: State = { hasError: false, error: null };

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, info: ErrorInfo) {
        logger.error("[ErrorBoundary] uncaught render error", error, info);
    }

    handleReset = () => {
        this.setState({ hasError: false, error: null });
    };

    render() {
        if (!this.state.hasError) {
            return this.props.children;
        }

        if (this.props.fallback) {
            return this.props.fallback;
        }

        return (
            <div className="min-h-screen flex items-center justify-center bg-background p-6">
                <div className="max-w-lg w-full rounded-xl border bg-card p-6 shadow">
                    <h1 className="text-xl font-semibold mb-2">Something went wrong</h1>
                    <p className="text-sm text-muted-foreground mb-4">
                        An unexpected error occurred while rendering this page. Try refreshing —
                        if it keeps happening, contact the development team.
                    </p>
                    {this.state.error && (
                        <pre className="text-xs bg-muted/50 rounded p-3 overflow-auto mb-4">
                            {this.state.error.message}
                        </pre>
                    )}
                    <div className="flex gap-2">
                        <button
                            type="button"
                            className="px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-sm"
                            onClick={() => window.location.reload()}
                        >
                            Reload
                        </button>
                        <button
                            type="button"
                            className="px-3 py-1.5 rounded-md border text-sm"
                            onClick={this.handleReset}
                        >
                            Try again
                        </button>
                    </div>
                </div>
            </div>
        );
    }
}