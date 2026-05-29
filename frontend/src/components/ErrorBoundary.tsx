import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, info: ErrorInfo) {
    }

    render() {

            return (
                        </p>
                        <button
                        >
                        </button>
                    </div>
                </div>
            );
        }
    }