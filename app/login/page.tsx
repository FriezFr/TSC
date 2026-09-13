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
  Globe,
  Bot,
  Sparkles,
  KeyRound,
} from 'lucide-react';
import { useApp } from '@/lib/context';
import { BaccalaureateTrack, BACCALAUREATE_TRACKS } from '@/lib/types';

type AuthMode = 'signin' | 'signup' | 'forgot';

export default function AuthPage() {
  const router = useRouter();
  const { user, authLoading, language, setLanguage, t } = useApp();
  const [mode, setMode] = useState<AuthMode>('signin');

  // Form Fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [track, setTrack] = useState<BaccalaureateTrack>('medical_life_sciences');
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

  const toggleLanguage = () => {
    setLanguage(language === 'en' ? 'ar' : 'en');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const supabase = getSupabaseClient();
    if (!supabase) {
      setErrorMsg(
        language === 'ar'
          ? 'الاتصال بقاعدة البيانات غير مهيأ. يرجى التحقق من متغيرات البيئة.'
          : 'Database connection is not configured. Please check your Supabase environment variables.'
      );
      return;
    }

    setLoading(true);

    try {
      if (mode === 'forgot') {
        if (!email.trim()) {
          throw new Error(
            language === 'ar'
              ? 'يرجى إدخال البريد الإلكتروني.'
              : 'Please enter your email address.'
          );
        }

        const redirectTo =
          typeof window !== 'undefined'
            ? `${window.location.origin}/dashboard/settings`
            : undefined;

        const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
          redirectTo,
        });

        if (error) throw error;

        setSuccessMsg(
          language === 'ar'
            ? 'تم إرسال رابط إعادة تعيين كلمة المرور إلى بريدك الإلكتروني بنجاح! تفقد بريدك (وصندوق الرسائل غير المرغوب فيها).'
            : 'Password reset link sent to your email successfully! Please check your inbox and spam folder.'
        );
      } else if (mode === 'signup') {
        // Client-side validations
        if (password.length < 6) {
          throw new Error(
            language === 'ar'
              ? 'يجب أن تتكون كلمة المرور من 6 أحرف على الأقل.'
              : 'Password must be at least 6 characters long.'
          );
        }
        if (password !== confirmPassword) {
          throw new Error(
            language === 'ar'
              ? 'كلمتا المرور غير متطابقتين. يرجى التأكد وإعادة المحاولة.'
              : 'Passwords do not match. Please verify your password.'
          );
        }
        if (!fullName.trim()) {
          throw new Error(
            language === 'ar' ? 'يرجى إدخال اسم الطالب بالكامل.' : 'Please enter your full name.'
          );
        }

        const parsedTarget = targetPercentage ? parseFloat(targetPercentage) : 95.0;

        const { data, error } = await supabase.auth.signUp({
          email: email.trim().toLowerCase(),
          password,
          options: {
            data: {
              full_name: fullName.trim(),
              study_division: track,
              target_percentage: isNaN(parsedTarget) ? 95.0 : parsedTarget,
            },
          },
        });

        if (error) {
          if (error.message.toLowerCase().includes('already registered')) {
            throw new Error(
              language === 'ar'
                ? 'يوجد حساب مسجل بالفعل بهذا البريد الإلكتروني. يرجى تسجيل الدخول.'
                : 'An account with this email already exists. Please SIGN IN.'
            );
          }
          throw error;
        }

        if (data.session) {
          router.push('/dashboard');
        } else {
          setSuccessMsg(
            language === 'ar'
              ? 'تم إنشاء الحساب بنجاح! تفقد بريدك الإلكتروني لتأكيد التسجيل، أو سجّل الدخول أدناه.'
              : 'Account created successfully! Check your inbox to confirm if required, or sign in below.'
          );
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
            throw new Error(
              language === 'ar'
                ? 'البريد الإلكتروني أو كلمة المرور غير صحيحة.'
                : 'Invalid email or password. If you do not have an account yet, click SIGN UP.'
            );
          }
          if (lower.includes('email not confirmed')) {
            throw new Error(
              language === 'ar'
                ? 'لم يتم تأكيد بريدك الإلكتروني بعد. يرجى مراجعة بريدك الإلكتروني.'
                : 'Your email has not been confirmed yet. Please check your inbox or spam folder.'
            );
          }
          throw error;
        }

        if (data?.session) {
          router.push('/dashboard');
        }
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : language === 'ar'
          ? 'فشل تسجيل الدخول. يرجى المحاولة مرة أخرى.'
          : 'Authentication failed. Please try again.';
      setErrorMsg(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col justify-center items-center p-4 sm:p-6 selection:bg-white selection:text-black relative">
      {/* Top Language Switcher Bar */}
      <div className="absolute top-4 right-4 z-20">
        <button
          onClick={toggleLanguage}
          className="px-3 py-1.5 rounded-xl bg-[#111111] hover:bg-[#1a1a1a] text-neutral-300 hover:text-white text-xs font-bold flex items-center gap-2 border border-white/10 transition-all cursor-pointer shadow-lg"
          title={language === 'en' ? 'التبديل إلى العربية' : 'Switch to English'}
        >
          <Globe className="w-3.5 h-3.5 text-neutral-400" />
          <span>{language === 'en' ? '🇪🇬 العربية' : '🇬🇧 English'}</span>
        </button>
      </div>

      <div className="w-full max-w-lg">
        {/* Brand & Badge Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#111111] border border-white/10 text-xs font-mono tracking-wider text-neutral-300 mb-3">
            <Bot className="w-4 h-4 text-white" />
            <span className="font-bold tracking-wider">
              TASKERBOT / TSC AI
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white uppercase">
            {mode === 'forgot'
              ? t('forgotPassword')
              : mode === 'signin'
              ? t('signIn')
              : t('signUp')}
          </h1>
          <p className="text-xs text-neutral-400 mt-1.5 max-w-md mx-auto">
            {mode === 'forgot'
              ? t('forgotPasswordDesc')
              : mode === 'signin'
              ? t('signInDesc')
              : t('signUpDesc')}
          </p>
        </div>

        {/* OLED Stealth Black Authentication Card */}
        <div className="bg-[#0a0a0a] rounded-2xl p-6 sm:p-8 border border-white/10 shadow-2xl backdrop-blur-xl">
          {/* Segmented Dual Tabs or Forgot Mode Back Header */}
          {mode === 'forgot' ? (
            <div className="flex items-center justify-between p-2 rounded-xl bg-[#141414] border border-white/10 mb-6">
              <div className="flex items-center gap-2 text-xs font-bold text-neutral-300 px-3">
                <KeyRound className="w-4 h-4 text-neutral-400" />
                <span>{t('forgotPassword')}</span>
              </div>
              <button
                type="button"
                onClick={() => handleModeSwitch('signin')}
                className="px-3.5 py-2 rounded-lg bg-white text-black text-xs font-black uppercase tracking-wider hover:bg-neutral-200 transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                <span>{t('backToSignIn')}</span>
              </button>
            </div>
          ) : (
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
                <span>{t('signIn')}</span>
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
                <span>{t('signUp')}</span>
              </button>
            </div>
          )}

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
                    {t('fullName')}
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-neutral-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder={language === 'ar' ? 'مثال: محمد صلاح' : 'e.g. Mohamed Salah'}
                      className="w-full glass-input pl-10 pr-3.5 py-2.5 rounded-xl text-sm"
                    />
                  </div>
                </div>

                {/* Baccalaureate Track */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold text-neutral-300">
                      {t('trackLabel')}
                    </label>
                    <span className="text-[10px] text-neutral-500 font-mono">
                      {language === 'ar' ? 'نظام البكالوريا الجديد' : 'Egyptian Baccalaureate'}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {BACCALAUREATE_TRACKS.map((tItem) => (
                      <button
                        key={tItem.id}
                        type="button"
                        onClick={() => setTrack(tItem.id)}
                        className={`p-2.5 text-left rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                          track === tItem.id
                            ? 'bg-white text-black border-white shadow'
                            : 'bg-[#111111] text-neutral-400 border-white/5 hover:text-white hover:border-white/20'
                        }`}
                      >
                        <span className="block font-bold text-xs">
                          {language === 'ar' ? tItem.name : tItem.en}
                        </span>
                        <span
                          className={`block text-[10px] mt-0.5 font-normal ${
                            track === tItem.id ? 'text-neutral-700' : 'text-neutral-500'
                          }`}
                        >
                          {language === 'ar' ? tItem.en : tItem.name}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Target Percentage */}
                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                    {t('targetPercentage')}
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
                      placeholder="95.0"
                      className="w-full glass-input pl-10 pr-3.5 py-2.5 rounded-xl text-sm font-mono"
                    />
                  </div>
                </div>
              </>
            )}

            {/* Email */}
            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                {t('emailLabel')}
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-neutral-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="student@example.com"
                  className="w-full glass-input pl-10 pr-3.5 py-2.5 rounded-xl text-sm"
                />
              </div>
            </div>

            {/* Password */}
            {mode !== 'forgot' && (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-neutral-300">
                    {t('passwordLabel')}
                  </label>
                  {mode === 'signin' && (
                    <button
                      type="button"
                      onClick={() => handleModeSwitch('forgot')}
                      className="text-[11px] font-medium text-neutral-400 hover:text-white transition-colors cursor-pointer"
                    >
                      {t('forgotPassword')}
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-neutral-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="•••••••••"
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
            )}

            {/* Confirm Password (SIGN UP mode only) */}
            {mode === 'signup' && (
              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                  {t('confirmPasswordLabel')}
                </label>
                <div className="relative">
                  <ShieldCheck className="w-4 h-4 text-neutral-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="•••••••••"
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
                  <span>{t('processing')}</span>
                </div>
              ) : (
                <>
                  <span>
                    {mode === 'forgot'
                      ? t('resetPasswordBtn')
                      : mode === 'signin'
                      ? t('signIn')
                      : t('signUp')}
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Switch Link Prompt */}
          <div className="mt-6 pt-5 border-t border-white/10 text-center">
            {mode === 'forgot' ? (
              <p className="text-xs text-neutral-400">
                <button
                  type="button"
                  onClick={() => handleModeSwitch('signin')}
                  className="text-white font-bold uppercase tracking-wider hover:underline cursor-pointer inline-flex items-center gap-1.5"
                >
                  <ArrowRight className="w-3.5 h-3.5 rotate-180" />
                  <span>{t('backToSignIn')}</span>
                </button>
              </p>
            ) : mode === 'signin' ? (
              <p className="text-xs text-neutral-400">
                {t('noAccount')}{' '}
                <button
                  type="button"
                  onClick={() => handleModeSwitch('signup')}
                  className="text-white font-bold uppercase tracking-wider hover:underline cursor-pointer ml-1"
                >
                  {t('signUpNow')}
                </button>
              </p>
            ) : (
              <p className="text-xs text-neutral-400">
                {t('haveAccount')}{' '}
                <button
                  type="button"
                  onClick={() => handleModeSwitch('signin')}
                  className="text-white font-bold uppercase tracking-wider hover:underline cursor-pointer ml-1"
                >
                  {t('signInHere')}
                </button>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
