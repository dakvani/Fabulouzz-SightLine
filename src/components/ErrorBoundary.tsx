import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw, ArrowLeft } from "lucide-react";

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("SightLine Component ErrorBoundary caught:", error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  private handleBackToProjects = () => {
    try {
      localStorage.removeItem("sightline_selected_project_id");
    } catch {
      // ignore
    }
    window.location.href = "/";
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[320px] p-6 flex flex-col items-center justify-center text-center glass-card border border-destructive/30 rounded-2xl my-6 max-w-xl mx-auto shadow-xl">
          <div className="w-12 h-12 rounded-xl bg-destructive/15 text-destructive flex items-center justify-center mb-4">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-foreground mb-1">
            {this.props.fallbackTitle || "Something went wrong loading this view"}
          </h3>
          <p className="text-xs text-muted-foreground mb-4 max-w-md font-mono bg-secondary/50 p-2.5 rounded-lg text-left break-words overflow-auto max-h-24">
            {this.state.error?.message || "An unexpected error occurred."}
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={this.handleReset}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-md"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Try Again
            </button>
            <button
              onClick={this.handleBackToProjects}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold border border-border/50 text-foreground hover:bg-secondary/40 transition-all"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back to Projects
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
