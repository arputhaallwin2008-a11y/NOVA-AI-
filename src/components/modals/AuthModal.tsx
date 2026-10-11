import React, { useState } from 'react';
import {
  Sparkles,
  Lock,
  Mail,
  User as UserIcon,
  ArrowRight,
  Loader2,
  AlertCircle,
  Zap,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.tsx';

interface AuthModalProps {
  isOpen: boolean;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen }) => {
  const { login, register, guestLogin } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      if (mode === 'login') {
        await login(email, password);
      } else {
        await register(email, password, displayName);
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGuest = async () => {
    setError(null);
    setIsLoading(true);
    try {
      await guestLogin();
    } catch (err: any) {
      setError(err.message || 'Failed to initialize guest preview.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-slate-700/80 bg-[#0F172A] p-6 sm:p-8 shadow-2xl">
        {/* Glow backdrop */}
        <div className="absolute -top-24 -left-24 h-48 w-48 rounded-full bg-violet-600/30 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 h-48 w-48 rounded-full bg-indigo-600/30 blur-3xl pointer-events-none" />

        {/* Brand header */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-violet-600 to-indigo-500 shadow-xl shadow-violet-500/30 ring-1 ring-violet-400/50 mb-3">
            <Sparkles className="h-6 w-6 text-white" />
          </div>
          <h2 className="text-2xl font-extrabold text-white">
            Welcome to NOVA AI
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Your personal full-stack intelligent assistant platform
          </p>
        </div>

        {/* Fast 1-Click Guest Access */}
        <div className="mb-6">
          <button
            type="button"
            onClick={handleGuest}
            disabled={isLoading}
            className="group flex w-full items-center justify-center gap-2 rounded-2xl border border-violet-500/50 bg-gradient-to-r from-violet-900/40 via-indigo-900/40 to-violet-900/40 p-3 text-xs sm:text-sm font-bold text-violet-200 shadow-lg hover:border-violet-400 hover:from-violet-800/60 hover:to-indigo-800/60 transition-all active:scale-[0.99]"
          >
            <Zap className="h-4 w-4 text-violet-400 group-hover:scale-110 transition-transform" />
            <span>Instant Guest Preview (No Password Needed)</span>
          </button>
          <div className="relative my-4 text-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-800" />
            </div>
            <span className="relative bg-[#0F172A] px-3 text-[11px] uppercase tracking-wider text-slate-500">
              Or sign in with email
            </span>
          </div>
        </div>

        {/* Tab switch */}
        <div className="flex rounded-xl bg-slate-900/80 p-1 mb-5 border border-slate-800">
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setError(null);
            }}
            className={`flex-1 rounded-lg py-1.5 text-xs font-semibold transition-all ${
              mode === 'login'
                ? 'bg-violet-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('register');
              setError(null);
            }}
            className={`flex-1 rounded-lg py-1.5 text-xs font-semibold transition-all ${
              mode === 'register'
                ? 'bg-violet-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Create Account
          </button>
        </div>

        {/* Error notice */}
        {error && (
          <div className="mb-4 flex items-center gap-2 rounded-xl border border-red-500/40 bg-red-950/50 p-3 text-xs text-red-200">
            <AlertCircle className="h-4 w-4 text-red-400 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          {mode === 'register' && (
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                Your Name
              </label>
              <div className="relative">
                <UserIcon className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                <input
                  type="text"
                  required
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="e.g. Alex Chen"
                  className="w-full rounded-xl border border-slate-700 bg-slate-900/80 py-2 pl-9 pr-3 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:border-violet-500 focus:outline-none"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-xl border border-slate-700 bg-slate-900/80 py-2 pl-9 pr-3 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:border-violet-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
                className="w-full rounded-xl border border-slate-700 bg-slate-900/80 py-2 pl-9 pr-3 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:border-violet-500 focus:outline-none"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-600 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-lg shadow-violet-600/30 hover:scale-101 active:scale-99 transition-all"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <span>{mode === 'login' ? 'Sign In' : 'Create Account'}</span>
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
