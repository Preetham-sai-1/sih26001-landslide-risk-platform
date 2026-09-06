import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an uncaught exception:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <div className="fixed top-4 right-4 z-50 p-4 bg-slate-950/95 backdrop-blur-xl border border-red-500/50 text-red-300 rounded-xl text-xs space-y-2 shadow-2xl max-w-sm">
          <h4 className="font-bold text-red-400">Drawer Rendering Error Prevented</h4>
          <p className="text-[11px] text-slate-400">{this.state.error?.message || "An unexpected rendering error occurred in this panel."}</p>
          <button 
            onClick={() => this.setState({ hasError: false, error: null })} 
            className="px-3 py-1 bg-red-600 hover:bg-red-500 text-white font-bold rounded text-[10px] shadow"
          >
            Reset Panel State
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
