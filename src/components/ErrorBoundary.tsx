"use client";

import { Component, ReactNode } from "react";
import { Button } from "./ui/Button";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  message?: string;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("[ErrorBoundary]", error, info);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 p-8 text-center">
          <h2 className="text-lg font-semibold text-slate-800">
            Đã xảy ra lỗi
          </h2>
          <p className="max-w-md text-sm text-slate-500">
            {this.state.message || "Vui lòng thử lại sau."}
          </p>
          <Button
            onClick={() => {
              this.setState({ hasError: false, message: undefined });
              window.location.reload();
            }}
          >
            Tải lại trang
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}
