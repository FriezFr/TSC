'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseClient } from '@/lib/supabase/client';
import {
  Lock,
  Mail,
  User,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  Eye,
  EyeOff,
  LogIn,
  UserPlus,
  Target,
  ShieldCheck,
  GraduationCap,
} from 'lucide-react';
import { useApp } from '@/lib/context';

type AuthMode = 'signin' | 'signup';
type Division = 'scientific_science' | 'scientific_math' | 'literary';

export default function AuthPage() {
  const router = useRouter();
  const { user, authLoading } = useApp();
  const [mode, setMode] = useState<AuthMode>('signin');

  // Form Fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [division, setDivision] = useState<Division>('scientific_science');
  const [targetPercentage, setTargetPercentage] = useState('');

  // UI State
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // If already logged in, redirect immediately to dashboard
  useEffect(() => {
    if (!authLoading && user) {
      router.push('/dashboard');
    }
  }, [user, authLoading, router]);

  const handleModeSwitch = (newMode: AuthMode) => {
    setMode(newMode);
    setErrorMsg('');
    setSuccessMsg('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const supabase = getSupabaseClient();
    if (!supabase) {
      setErrorMsg('Database connection is not configured. Please check your Supabase environment variables in Vercel.');
      return;
    }

    setLoading(true);

    try {
      if (mode === 'signup') {
        // Client-side validations
        if (password.length < 6) {
          throw new Error('Password must be at least 6 characters long.');
        }
        if (password !== confirmPassword) {
          throw new Error('Passwords do not match. Please verify your password.');
        }
        if (!fullName.trim()) {
          throw new Error('Please enter your full name.');
        }

        const parsedTarget = targetPercentage ? parseFloat(targetPercentage) : 95.0;

        const { data, error } = await supabase.auth.signUp({
          email: email.trim().toLowerCase(),
          password,
          options: {
            data: {
              full_name: fullName.trim(),
              study_division: division,
              target_percentage: isNaN(parsedTarget) ? 95.0 : parsedTarget,
            },
          },
        });

        if (error) {
          if (error.message.toLowerCase().includes('already registered')) {
            throw new Error('An account with this email already exists. Please SIGN IN.');
          }
          throw error;
        }

        if (data.session) {
          // Direct login without email confirmation
          router.push('/dashboard');
        } else {
          // Supabase email confirmation enabled
          setSuccessMsg('Account created successfully! If email verification is enabled, check your inbox to confirm, or click SIGN IN below.');
          setMode('signin');
          setPassword('');
          setConfirmPassword('');
        }
      } else {
        // Sign In
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim().toLowerCase(),
          password,
        });

        if (error) {
          const lower = error.message.toLowerCase();
          if (lower.includes('invalid login credentials') || lower.includes('invalid grant')) {
            throw new Error('Invalid email or password. If you do not have an account yet, click SIGN UP.');
          }
          if (lower.includes('email not confirmed')) {
            throw new Error('Your email has not been confirmed yet. Please check your inbox or spam folder.');
          }
          throw error;
        }

        if (data?.session) {
          router.push('/dashboard');
        }
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Authentication failed. Please try again.';
      setErrorMsg(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col justify-center items-center p-4 sm:p-6 selection:bg-white selection:text-black">
      <div className="w-full max-w-md">
        {/* Brand & Badge Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#111111] border border-white/10 text-[11px] font-mono tracking-wider text-neutral-400 mb-3">
            <GraduationCap className="w-3.5 h-3.5 text-white" />
            <span>ثانوية عامة • THANAWEYA</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white uppercase">
            {mode === 'signin' ? 'SIGN IN' : 'SIGN UP'}
          </h1>
          <p className="text-xs text-neutral-400 mt-1.5 max-w-xs mx-auto">
            {mode === 'signin'
              ? 'Enter your student credentials to access your private dashboard'
              : 'Create your private student profile to track your revision and exams'}
          </p>
        </div>

        {/* OLED Stealth Black Authentication Card */}
        <div className="bg-[#0a0a0a] rounded-2xl p-6 sm:p-8 border border-white/10 shadow-2xl backdrop-blur-xl">
          {/* Prominent High-Contrast Segmented Tabs */}
          <div className="grid grid-cols-2 p-1 rounded-xl bg-[#141414] border border-white/10 mb-6">
            <button
              type="button"
              onClick={() => handleModeSwitch('signin')}
              className={`py-3 text-xs font-black uppercase tracking-wider rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer ${
                mode === 'signin'
                  ? 'bg-white text-black shadow-md'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <LogIn className="w-4 h-4" />
              <span>SIGN IN</span>
            </button>

            <button
              type="button"
              onClick={() => handleModeSwitch('signup')}
              className={`py-3 text-xs font-black uppercase tracking-wider rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer ${
                mode === 'signup'
                  ? 'bg-white text-black shadow-md'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <UserPlus className="w-4 h-4" />
              <span>SIGN UP</span>
            </button>
          </div>

          {/* Feedback Messages */}
          {errorMsg && (
            <div className="mb-5 p-3.5 rounded-xl bg-red-950/50 border border-red-800/80 text-red-200 text-xs flex items-start gap-2.5 animate-in fade-in duration-200">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-400" />
              <span className="leading-relaxed">{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="mb-5 p-3.5 rounded-xl bg-emerald-950/50 border border-emerald-800/80 text-emerald-200 text-xs flex items-start gap-2.5 animate-in fade-in duration-200">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" />
              <span className="leading-relaxed">{successMsg}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <>
                {/* Full Name */}
                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                    Full Name (الاسم)
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-neutral-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full glass-input pl-10 pr-3.5 py-2.5 rounded-xl text-sm"
                    />
                  </div>
                </div>

                {/* Division Selector (Interactive Pills) */}
                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                    Academic Division (الشعبة)
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setDivision('scientific_science')}
                      className={`py-2 px-1 text-center rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                        division === 'scientific_science'
                          ? 'bg-white text-black border-white'
                          : 'bg-[#111111] text-neutral-400 border-white/5 hover:text-white hover:border-white/20'
                      }`}
                    >
                      علمي علوم
                    </button>
                    <button
                      type="button"
                      onClick={() => setDivision('scientific_math')}
                      className={`py-2 px-1 text-center rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                        division === 'scientific_math'
                          ? 'bg-white text-black border-white'
                          : 'bg-[#111111] text-neutral-400 border-white/5 hover:text-white hover:border-white/20'
                      }`}
                    >
                      علمي رياضة
                    </button>
                    <button
                      type="button"
                      onClick={() => setDivision('literary')}
                      className={`py-2 px-1 text-center rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                        division === 'literary'
                          ? 'bg-white text-black border-white'
                          : 'bg-[#111111] text-neutral-400 border-white/5 hover:text-white hover:border-white/20'
                      }`}
                    >
                      أدبي
                    </button>
                  </div>
                </div>

                {/* Target Percentage */}
                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                    Target Score Percentage % (النسبة المستهدفة)
                  </label>
                  <div className="relative">
                    <Target className="w-4 h-4 text-neutral-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="number"
                      step="0.1"
                      min="50"
                      max="100"
                      value={targetPercentage}
                      onChange={(e) => setTargetPercentage(e.target.value)}
                      className="w-full glass-input pl-10 pr-3.5 py-2.5 rounded-xl text-sm font-mono"
                    />
                  </div>
                </div>
              </>
            )}

            {/* Email */}
            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-neutral-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full glass-input pl-10 pr-3.5 py-2.5 rounded-xl text-sm"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-neutral-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full glass-input pl-10 pr-10 py-2.5 rounded-xl text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white cursor-pointer"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Confirm Password (SIGN UP mode only) */}
            {mode === 'signup' && (
              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                  Confirm Password
                </label>
                <div className="relative">
                  <ShieldCheck className="w-4 h-4 text-neutral-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full glass-input pl-10 pr-10 py-2.5 rounded-xl text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white cursor-pointer"
                    tabIndex={-1}
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl glass-button-primary text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 mt-5 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                  <span>Processing...</span>
                </div>
              ) : (
                <>
                  <span>{mode === 'signin' ? 'SIGN IN' : 'SIGN UP'}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Switch Link Prompt */}
          <div className="mt-6 pt-5 border-t border-white/10 text-center">
            {mode === 'signin' ? (
              <p className="text-xs text-neutral-400">
                Don't have an account yet?{' '}
                <button
                  type="button"
                  onClick={() => handleModeSwitch('signup')}
                  className="text-white font-bold uppercase tracking-wider hover:underline cursor-pointer ml-1"
                >
                  SIGN UP NOW
                </button>
              </p>
            ) : (
              <p className="text-xs text-neutral-400">
                Already registered?{' '}
                <button
                  type="button"
                  onClick={() => handleModeSwitch('signin')}
                  className="text-white font-bold uppercase tracking-wider hover:underline cursor-pointer ml-1"
                >
                  SIGN IN HERE
                </button>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
