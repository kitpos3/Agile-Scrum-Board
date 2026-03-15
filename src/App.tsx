/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, ReactNode, ErrorInfo } from 'react';
import { auth, signInWithGoogle, logout } from './firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import SprintTracker from './SprintTracker';
import { LogOut, Loader2 } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = { hasError: false, error: null };
  public props: ErrorBoundaryProps;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.props = props;
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#0a0a12] text-[#e0e0ee] flex flex-col items-center justify-center p-8 font-mono">
          <div className="bg-[#12122a] border border-[#ff6b6b]/30 p-8 rounded-xl max-w-2xl w-full">
            <h1 className="text-2xl font-bold text-[#ff6b6b] mb-4">Something went wrong</h1>
            <pre className="bg-[#0a0a12] p-4 rounded-lg overflow-x-auto text-sm text-[#aaaacc] border border-[#2a2a44]">
              {this.state.error?.message}
            </pre>
            <button
              onClick={() => window.location.reload()}
              className="mt-6 px-6 py-2 bg-[#5b9ff9] text-[#0a0a12] font-bold rounded-lg hover:bg-[#4a8ee8] transition-colors"
            >
              Reload Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a12] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#5b9ff9] animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#0a0a12] text-[#e0e0ee] flex flex-col items-center justify-center p-8 font-mono">
        <div className="bg-[#12122a] border border-[#2a2a44] p-10 rounded-2xl max-w-md w-full text-center shadow-2xl">
          <div className="w-16 h-16 bg-[#5b9ff9]/10 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-[#5b9ff9]/20">
            <div className="w-8 h-8 rounded-full bg-[#5b9ff9]" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2 font-sans tracking-tight">Agile Tracker</h1>
          <p className="text-[#aaaacc] text-sm mb-8">Sign in to manage your sprints and tasks.</p>
          <button
            onClick={signInWithGoogle}
            className="w-full py-3 px-4 bg-white text-black font-semibold rounded-xl hover:bg-gray-100 transition-colors flex items-center justify-center gap-3"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Sign in with Google
          </button>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-[#0a0a12] text-[#e0e0ee] font-mono flex flex-col">
        <header className="px-7 py-4 border-b border-[#1a1a30] flex justify-between items-center bg-[#0a0a12] z-10 relative">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-[#5b9ff9]/10 rounded-lg flex items-center justify-center border border-[#5b9ff9]/20">
              <div className="w-4 h-4 rounded-full bg-[#5b9ff9]" />
            </div>
            <span className="font-sans font-bold text-white tracking-tight">Agile Tracker</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm text-[#aaaacc]">
              <img src={user.photoURL || ''} alt="Avatar" className="w-6 h-6 rounded-full" />
              <span className="hidden sm:inline">{user.displayName}</span>
            </div>
            <button
              onClick={logout}
              className="p-2 text-[#777799] hover:text-white hover:bg-[#1a1a30] rounded-lg transition-colors"
              title="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </header>
        <main className="flex-1 overflow-auto">
          <SprintTracker user={user} />
        </main>
      </div>
    </ErrorBoundary>
  );
}
