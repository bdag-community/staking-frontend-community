import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCcw, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null,
    };

    public static getDerivedStateFromError(error: Error): State {
        // Update state so the next render will show the fallback UI.
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error("Uncaught error:", error, errorInfo);
    }

    private handleReset = () => {
        this.setState({ hasError: false, error: null });
        window.location.reload();
    };

    private handleGoHome = () => {
        this.setState({ hasError: false, error: null });
        window.location.href = "/";
    };

    public render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen w-full flex items-center justify-center bg-background p-4 font-sans">
                    <div className="max-w-md w-full space-y-8 text-center animate-fade-in">
                        <div className="relative inline-block">
                            <div className="absolute inset-0 blur-2xl opacity-20 bg-destructive rounded-full" />
                            <div className="relative bg-card border border-destructive/20 rounded-2xl p-6 shadow-2xl">
                                <AlertTriangle className="w-16 h-16 text-destructive mx-auto mb-4" />
                                <h1 className="text-3xl font-display font-bold text-foreground mb-2">
                                    System Error
                                </h1>
                                <p className="text-muted-foreground text-sm mb-6 leading-relaxed">
                                    We've encountered an unexpected issue while processing your request.
                                    Don't worry, your funds are safe on the blockchain.
                                </p>

                                {process.env.NODE_ENV === "development" && (
                                    <div className="text-left bg-black/40 rounded-lg p-3 mb-6 overflow-auto max-h-40 border border-white/5">
                                        <p className="text-xs font-mono text-destructive break-words">
                                            {this.state.error?.toString()}
                                        </p>
                                    </div>
                                )}

                                <div className="grid grid-cols-2 gap-4">
                                    <Button
                                        variant="outline"
                                        onClick={this.handleReset}
                                        className="flex items-center justify-center gap-2 border-primary/20 hover:bg-primary/10"
                                    >
                                        <RefreshCcw className="w-4 h-4" />
                                        Retry
                                    </Button>
                                    <Button
                                        variant="glow"
                                        onClick={this.handleGoHome}
                                        className="flex items-center justify-center gap-2 hover:opacity-90 border-none"
                                    >
                                        <Home className="w-4 h-4" />
                                        Home
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
