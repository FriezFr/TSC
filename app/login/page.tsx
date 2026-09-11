'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { GraduationCap, Sparkles, ArrowRight, Lock, Mail, User, AlertCircle } from 'lucide-react';
import { useApp } from '@/lib/context';

export default function LoginPage() {
  const router = useRouter();
  const { isConfigured, setDemoMode } = useApp();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [division, setDivision] = useState<'scientific_science' | 'scientific_math' | 'literary'>('scientific_science');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setLoading(true);

    const supabase = getSupabaseClient();
    if (!supabase) {
      setErrorMsg(
        'Supabase is not configured yet with environment variables. You can continue using Demo Mode!'
      );
      setLoading(false);
      return;
    }

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
              study_division: division,
            },
          },
        });
        if (error) throw error;
        setSuccessMsg('Account created successfully! Check your email or log in.');
        setIsSignUp(false);
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        setDemoMode(false);
        router.push('/dashboard');
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Authentication failed';
      setErrorMsg(message);
    } finally {
      setLoading(false);
    }
  };

  const handleDemoBypass = () => {
    setDemoMode(true);
    router.push('/dashboard');
  };

  return (
    <div className="min-h-screen bg-liquid-mesh text-slate-100 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background glowing orbs */}
      <div className="absolute top-1/4 left-1/3 w-80 h-80 rounded-full bg-cyan-500/15 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/3 w-80 h-80 rounded-full bg-blue-600/15 blur-[100px] pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {/* Card Header Brand */}
        <div className="text-center mb-6">
          <Link href="/" className="inline-flex items-center gap-2.5 mb-2">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-slate-950 shadow-[0_0_20px_rgba(0,240,255,0.4)]">
              <GraduationCap className="w-5 h-5 text-black stroke-[2.5]" />
            </div>
            <span className="text-xl font-bold tracking-tight text-white">Thanaweya</span>
          </Link>
          <h1 className="text-2xl font-black tracking-tight text-white">
            {isSignUp ? 'Create Student Account' : 'Welcome Back'}
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            {isSignUp
              ? 'Private and encrypted data with Supabase RLS'
              : 'Sign in to access your timetable, grades & exams'}
          </p>
        </div>

        {/* Liquid Glass Auth Card */}
        <div className="glass-panel rounded-3xl p-7 border border-white/10 shadow-2xl relative">
          <div className="absolute top-0 left-10 right-10 h-[1px] bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent pointer-events-none" />

          {/* Mode Tabs */}
          <div className="grid grid-cols-2 p-1 rounded-2xl bg-white/[0.04] border border-white/10 mb-6">
            <button
              type="button"
              onClick={() => {
                setIsSignUp(false);
                setErrorMsg('');
                setSuccessMsg('');
              }}
              className={`py-2 text-xs font-semibold rounded-xl transition-all ${
                !isSignUp
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/30 shadow-[0_0_12px_rgba(0,240,255,0.2)]'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setIsSignUp(true);
                setErrorMsg('');
                setSuccessMsg('');
              }}
              className={`py-2 text-xs font-semibold rounded-xl transition-all ${
                isSignUp
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/30 shadow-[0_0_12px_rgba(0,240,255,0.2)]'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Sign Up
            </button>
          </div>

          {errorMsg && (
            <div className="mb-4 p-3 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="mb-4 p-3 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-start gap-2">
              <Sparkles className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignUp && (
              <>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Student Full Name (الاسم بالكامل)
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      placeholder="Ahmed Mohamed (أحمد محمد)"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full glass-input pl-10 pr-4 py-2.5 rounded-2xl text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Thanaweya Division (الشعبة)
                  </label>
                  <select
                    value={division}
                    onChange={(e) => setDivision(e.target.value as any)}
                    className="w-full glass-input px-4 py-2.5 rounded-2xl text-sm bg-slate-900/90 text-slate-100"
                  >
                    <option value="scientific_science">علمي علوم (Scientific Science)</option>
                    <option value="scientific_math">علمي رياضة (Scientific Math)</option>
                    <option value="literary">أدبي (Literary / Arts)</option>
                  </select>
                </div>
              </>
            )}

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  placeholder="student@thanaweya.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full glass-input pl-10 pr-4 py-2.5 rounded-2xl text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full glass-input pl-10 pr-4 py-2.5 rounded-2xl text-sm"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-2xl glass-button-primary text-sm font-bold flex items-center justify-center gap-2 mt-2"
            >
              {loading ? (
                <span>Processing...</span>
              ) : (
                <>
                  <span>{isSignUp ? 'Create Account' : 'Sign In'}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Bypass */}
          <div className="mt-6 pt-5 border-t border-white/10 text-center">
            <p className="text-xs text-slate-400 mb-2.5">
              Want to preview the dashboard instantly?
            </p>
            <button
              type="button"
              onClick={handleDemoBypass}
              className="w-full py-2.5 rounded-2xl glass-button-secondary text-xs font-semibold flex items-center justify-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              <span>Continue with Interactive Demo Mode</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
