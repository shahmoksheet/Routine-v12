import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
 children?: ReactNode;
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
 console.error('Uncaught error:', error, errorInfo);
 }

 public render() {
 if (this.state.hasError) {
 return (
 <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 p-6 text-center transition-colors">
 <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mb-6">
 <AlertTriangle className="w-10 h-10 text-red-600" />
 </div>
 <h1 className="text-2xl font-bold text-slate-900 mb-2">Something went wrong</h1>
 <p className="text-slate-500 mb-8 max-w-sm">
 We encountered an unexpected error. Please try refreshing the page or contact support if the problem persists.
 </p>
 <div className="bg-white p-4 rounded-xl border border-slate-200 w-full max-w-md mb-8 overflow-auto text-left shadow-sm">
 <p className="text-sm font-mono text-red-600 break-words">
 {this.state.error?.message || 'Unknown error'}
 </p>
 </div>
 <button
 onClick={() => window.location.reload()}
 className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-6 py-3 rounded-xl font-semibold transition-colors shadow-sm shadow-primary-600/20"
 >
 <RefreshCw className="w-5 h-5" />
 Reload Page
 </button>
 </div>
 );
 }

 return this.props.children;
 }
}
