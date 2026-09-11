'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseClient } from '@/lib/supabase/client';
import { Lock, Mail, User, AlertCircle, CheckCircle2, ArrowRight } from 'lucide-react';
import { useApp } from '@/lib/context';

export default function AuthPage() {
  const router = useRouter();
  const { user, authLoading } = useApp();
  const [isSignUp, setIsSignUp] = useState(false);

  // Form Fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [division, setDivision] = useState<'scientific_science' | 'scientific_math' | 'literary'>('scientific_science');
  const [targetPercentage, setTargetPercentage] = useState('95');

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // If already logged in, redirect to dashboard
  useEffect(() => {
    if (!authLoading && user) {
      router.push('/dashboard');
    }
  }, [user, authLoading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setLoading(true);

    const supabase = getSupabaseClient();
    if (!supabase) {
      setErrorMsg('Supabase is not configured. Please ensure environment variables are set.');
      setLoading(false);
      return;
    }

    try {
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: {
              full_name: fullName.trim(),
              study_division: division,
              target_percentage: Number(targetPercentage) || 95,
            },
          },
        });

        if (error) throw error;

        if (data.session) {
          router.push('/dashboard');
        } else {
          setSuccessMsg('Account created successfully! Check your email to confirm your signup or sign in.');
          setIsSignUp(false);
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

        if (error) throw error;
        router.push('/dashboard');
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Authentication error';
      setErrorMsg(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-black tracking-tight text-white">
            Thanaweya Dashboard
          </h1>
          <p className="text-xs text-neutral-400 mt-1">
            {isSignUp ? 'Create your private student account' : 'Sign in to access your dashboard'}
          </p>
        </div>

        {/* OLED Matte Black Card */}
        <div className="bg-[#0a0a0a] rounded-2xl p-7 border border-white/10 shadow-2xl">
          {/* Mode Switcher */}
          <div className="grid grid-cols-2 p-1 rounded-xl bg-[#141414] border border-white/5 mb-6">
            <button
              type="button"
              onClick={() => {
                setIsSignUp(false);
                setErrorMsg('');
                setSuccessMsg('');
              }}
              className={`py-2 text-xs font-semibold rounded-lg transition-all ${
                !isSignUp
                  ? 'bg-white text-black font-bold shadow'
                  : 'text-neutral-400 hover:text-white'
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
              className={`py-2 text-xs font-semibold rounded-lg transition-all ${
                isSignUp
                  ? 'bg-white text-black font-bold shadow'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              Sign Up
            </button>
          </div>

          {errorMsg && (
            <div className="mb-4 p-3 rounded-xl bg-red-950/40 border border-red-800/60 text-red-300 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="mb-4 p-3 rounded-xl bg-emerald-950/40 border border-emerald-800/60 text-emerald-300 text-xs flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignUp && (
              <>
                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                    Full Name
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full glass-input pl-9 pr-3 py-2.5 rounded-xl text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                    Thanaweya Division
                  </label>
                  <select
                    value={division}
                    onChange={(e) => setDivision(e.target.value as any)}
                    className="w-full glass-input px-3 py-2.5 rounded-xl text-sm bg-[#0d0d0d] text-white"
                  >
                    <option value="scientific_science">علمي علوم (Science)</option>
                    <option value="scientific_math">علمي رياضة (Math)</option>
                    <option value="literary">أدبي (Literary)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                    Target Overall Percentage %
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="50"
                    max="100"
                    required
                    value={targetPercentage}
                    onChange={(e) => setTargetPercentage(e.target.value)}
                    className="w-full glass-input px-3 py-2.5 rounded-xl text-sm font-mono"
                  />
                </div>
              </>
            )}

            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full glass-input pl-9 pr-3 py-2.5 rounded-xl text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full glass-input pl-9 pr-3 py-2.5 rounded-xl text-sm"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl glass-button-primary text-sm font-bold flex items-center justify-center gap-2 mt-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <span>Please wait...</span>
              ) : (
                <>
                  <span>{isSignUp ? 'Create Account' : 'Sign In'}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
