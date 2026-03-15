/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, ReactNode, ErrorInfo } from 'react';
import { supabase, signInWithEmail, signUpWithEmail, logout } from './supabase';
import { User } from '@supabase/supabase-js';
import SprintTracker from './SprintTracker';
import { LogOut, Loader2, Mail, Lock, UserPlus, LogIn } from 'lucide-react';

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
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) return;
    setAuthLoading(true);
    setAuthError('');
    try {
      if (isSignUp) {
        await signUpWithEmail(email.trim(), password.trim());
      } else {
        await signInWithEmail(email.trim(), password.trim());
      }
    } catch (error: any) {
      setAuthError(error.message || 'Authentication failed');
    } finally {
      setAuthLoading(false);
    }
  };

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
          <p className="text-[#aaaacc] text-sm mb-8">
            {isSignUp ? 'Create an account to get started.' : 'Sign in to manage your sprints and tasks.'}
          </p>

          <form onSubmit={handleAuth} className="space-y-4 text-left">
            <div>
              <label className="block text-xs uppercase tracking-wider text-[#777799] mb-1.5 font-semibold">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#555577]" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full bg-[#0a0a12] border border-[#2a2a44] rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-[#5b9ff9] transition-colors text-white placeholder-[#555577]"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wider text-[#777799] mb-1.5 font-semibold">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#555577]" />
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min 6 characters"
                  className="w-full bg-[#0a0a12] border border-[#2a2a44] rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-[#5b9ff9] transition-colors text-white placeholder-[#555577]"
                />
              </div>
            </div>

            {authError && (
              <p className="text-[#ff6b6b] text-xs text-center">{authError}</p>
            )}

            <button
              type="submit"
              disabled={authLoading}
              className="w-full py-3 px-4 bg-[#5b9ff9] text-[#0a0a12] font-semibold rounded-xl hover:bg-[#4a8ee8] transition-colors flex items-center justify-center gap-3 disabled:opacity-50"
            >
              {authLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : isSignUp ? (
                <UserPlus className="w-5 h-5" />
              ) : (
                <LogIn className="w-5 h-5" />
              )}
              {authLoading ? 'Please wait...' : isSignUp ? 'Create Account' : 'Sign In'}
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-[#2a2a44]">
            <button
              onClick={() => { setIsSignUp(!isSignUp); setAuthError(''); }}
              className="text-[#5b9ff9] text-sm hover:underline"
            >
              {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
            </button>
          </div>
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
              <span className="hidden sm:inline">{user.email}</span>
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
