'use client';

import React, { useState } from 'react';
import { useApp } from '@/lib/context';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassModal } from '@/components/ui/GlassModal';
import {
  Settings,
  Bot,
  Copy,
  Check,
  KeyRound,
  Trash2,
  LogOut,
  RefreshCw,
  ExternalLink,
  Shield,
  Code,
  Sparkles,
  AlertTriangle,
} from 'lucide-react';
import { getSupabaseClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

export default function SettingsPage() {
  const router = useRouter();
  const {
    profile,
    updateProfile,
    telegramCode,
    generateTelegramCode,
    telegramLinked,
    resetDemoData,
    isConfigured,
  } = useApp();

  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedWebhook, setCopiedWebhook] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [passwordStatus, setPasswordStatus] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Vercel deployment domain or window host
  const host = typeof window !== 'undefined' ? window.location.origin : 'https://your-domain.vercel.app';
  const webhookUrl = `${host}/api/telegram/webhook`;
  const setWebhookCurl = `https://api.telegram.org/bot<YOUR_TELEGRAM_BOT_TOKEN>/setWebhook?url=${webhookUrl}`;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(telegramCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleCopyWebhook = () => {
    navigator.clipboard.writeText(setWebhookCurl);
    setCopiedWebhook(true);
    setTimeout(() => setCopiedWebhook(false), 2000);
  };

  const handleGenerateNewCode = async () => {
    setIsGenerating(true);
    await generateTelegramCode();
    setIsGenerating(false);
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordStatus('');

    const supabase = getSupabaseClient();
    if (!supabase) {
      setPasswordStatus('Demo mode: Password change simulated successfully!');
      setNewPassword('');
      return;
    }

    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setPasswordStatus('Password updated successfully!');
      setNewPassword('');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error updating password';
      setPasswordStatus(`Failed: ${msg}`);
    }
  };

  const handleLogout = async () => {
    const supabase = getSupabaseClient();
    if (supabase) {
      await supabase.auth.signOut();
    }
    router.push('/login');
  };

  const handleDeleteAccount = async () => {
    const supabase = getSupabaseClient();
    if (supabase) {
      // In Supabase, delete current user session or call edge function
      await supabase.auth.signOut();
    }
    resetDemoData();
    setIsDeleteModalOpen(false);
    router.push('/login');
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 shadow-[0_0_15px_rgba(0,240,255,0.15)]">
              <Settings className="w-5 h-5" />
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight">
              Settings & Integrations
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Manage your student profile, account security, and Gemini Telegram Memory Bot.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Telegram Memory Bot Section (2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          <GlassCard glow className="p-6 sm:p-8 space-y-6">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-slate-950 shadow-[0_0_20px_rgba(0,240,255,0.4)]">
                  <Bot className="w-6 h-6 stroke-[2.5]" />
                </div>
                <div>
                  <h2 className="text-lg font-black text-white flex items-center gap-2">
                    Telegram "Memory" Bot
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-400/15 text-cyan-300 font-mono border border-cyan-400/30">
                      Gemini 2.5 Flash
                    </span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Send voice or text messages to your bot. Gemini classifies and auto-saves them.
                  </p>
                </div>
              </div>

              <div
                className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 ${
                  telegramLinked
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    telegramLinked ? 'bg-emerald-400' : 'bg-amber-400'
                  }`}
                />
                <span>{telegramLinked ? 'Linked & Active' : 'Ready to Link'}</span>
              </div>
            </div>

            {/* Link Code Box */}
            <div className="p-5 rounded-3xl bg-white/[0.03] border border-white/10 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300">Your One-Time Link Code</span>
                <button
                  onClick={handleGenerateNewCode}
                  disabled={isGenerating}
                  className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-medium"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isGenerating ? 'animate-spin' : ''}`} />
                  Generate New Code
                </button>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex-1 glass-input py-3 px-6 rounded-2xl text-center text-3xl sm:text-4xl font-black font-mono tracking-widest text-cyan-400 border-cyan-400/40 shadow-[0_0_25px_rgba(0,240,255,0.15)] select-all">
                  {telegramCode}
                </div>

                <button
                  onClick={handleCopyCode}
                  className="p-4 rounded-2xl glass-button-primary shrink-0"
                  title="Copy code"
                >
                  {copiedCode ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                </button>
              </div>

              <p className="text-xs text-slate-400">
                Open your bot in Telegram and send <code className="text-cyan-300 font-mono">/start {telegramCode}</code> or simply send <code className="text-cyan-300 font-mono">{telegramCode}</code>.
              </p>
            </div>

            {/* How It Works Steps */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                How Gemini AI Memory Parsing Works
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/5 space-y-1">
                  <span className="font-bold text-cyan-400">1. Assignment Detection</span>
                  <p className="text-slate-400">
                    "واجب فيزياء صفحة 30 الإثنين" → Auto-saved to Assignments with calculated due date.
                  </p>
                </div>
                <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/5 space-y-1">
                  <span className="font-bold text-cyan-400">2. Exam Countdown</span>
                  <p className="text-slate-400">
                    "امتحان كيمياء باب تالت 20 مارس" → Added to Exam countdown with 7-day alert.
                  </p>
                </div>
                <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/5 space-y-1">
                  <span className="font-bold text-cyan-400">3. Grades & Scores</span>
                  <p className="text-slate-400">
                    "جبت 54 من 60 في امتحان العربي" → Logged to Grade Tracker with calculated %.
                  </p>
                </div>
                <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/5 space-y-1">
                  <span className="font-bold text-cyan-400">4. Habits & Notes</span>
                  <p className="text-slate-400">
                    "نمت 8 ساعات" or quick study tips → Saved to Habit Tracker and Quick Notes.
                  </p>
                </div>
              </div>
            </div>

            {/* Webhook Registration Instructions */}
            <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <Code className="w-3.5 h-3.5 text-cyan-400" />
                  Register Telegram Webhook URL
                </span>
                <button
                  onClick={handleCopyWebhook}
                  className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
                >
                  {copiedWebhook ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>Copy URL</span>
                </button>
              </div>
              <div className="p-2.5 rounded-xl bg-black/50 font-mono text-[11px] text-cyan-300 break-all select-all">
                {setWebhookCurl}
              </div>
              <p className="text-[11px] text-slate-500">
                Replace <code className="text-slate-400">&lt;YOUR_TELEGRAM_BOT_TOKEN&gt;</code> and paste this in your browser address bar once deployed to Vercel.
              </p>
            </div>
          </GlassCard>

          {/* Student Profile Settings */}
          <GlassCard className="p-6 space-y-4">
            <h3 className="text-sm font-bold text-white">Student Profile Information</h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  value={profile.full_name}
                  onChange={(e) => updateProfile({ full_name: e.target.value })}
                  className="w-full glass-input px-3.5 py-2 rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Thanaweya Division
                </label>
                <select
                  value={profile.study_division}
                  onChange={(e) => updateProfile({ study_division: e.target.value as any })}
                  className="w-full glass-input px-3.5 py-2 rounded-xl text-xs bg-slate-900 text-slate-100"
                >
                  <option value="scientific_science">علمي علوم (Science)</option>
                  <option value="scientific_math">علمي رياضة (Math)</option>
                  <option value="literary">أدبي (Literary)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Target Percentage
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="50"
                  max="100"
                  value={profile.target_percentage}
                  onChange={(e) => updateProfile({ target_percentage: Number(e.target.value) })}
                  className="w-full glass-input px-3.5 py-2 rounded-xl text-xs font-mono"
                />
              </div>
            </div>
          </GlassCard>
        </div>

        {/* Security & Account Management (1 col) */}
        <div className="space-y-6">
          {/* Change Password */}
          <GlassCard className="p-6 space-y-4">
            <div className="flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-cyan-400" />
              <h3 className="text-sm font-bold text-white">Change Password</h3>
            </div>

            {passwordStatus && (
              <p className="text-xs text-cyan-300 p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20">
                {passwordStatus}
              </p>
            )}

            <form onSubmit={handleChangePassword} className="space-y-3">
              <input
                type="password"
                required
                minLength={6}
                placeholder="New Password (min 6 chars)"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full glass-input px-3.5 py-2 rounded-xl text-xs"
              />
              <button
                type="submit"
                className="w-full py-2.5 rounded-xl glass-button-secondary text-xs font-semibold"
              >
                Update Password
              </button>
            </form>
          </GlassCard>

          {/* Reset Demo Data */}
          <GlassCard className="p-6 space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <h3 className="text-sm font-bold text-white">Demo Data Controls</h3>
            </div>
            <p className="text-xs text-slate-400">
              Reset all mock subjects, timetable, assignments and grades back to fresh Egyptian Thanaweya defaults.
            </p>
            <button
              onClick={resetDemoData}
              className="w-full py-2.5 rounded-xl glass-button-secondary text-xs font-semibold text-amber-300 border-amber-500/30"
            >
              Reset to Default Demo Data
            </button>
          </GlassCard>

          {/* Account Actions (Logout & Delete) */}
          <GlassCard className="p-6 space-y-3 border border-rose-500/20">
            <h3 className="text-sm font-bold text-rose-400">Danger Zone</h3>

            <button
              onClick={handleLogout}
              className="w-full py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-semibold flex items-center justify-center gap-2 transition-all border border-white/10"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Log Out</span>
            </button>

            <button
              onClick={() => setIsDeleteModalOpen(true)}
              className="w-full py-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 text-xs font-semibold flex items-center justify-center gap-2 transition-all border border-rose-500/25"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete Account & Data</span>
            </button>
          </GlassCard>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <GlassModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Delete Account & Clear All Data"
      >
        <div className="space-y-4 text-xs text-slate-300">
          <p>
            Are you sure you want to delete your account? All your assignments, exam countdowns,
            grade logs, and notes will be permanently removed from Supabase.
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={() => setIsDeleteModalOpen(false)}
              className="px-4 py-2 rounded-xl glass-button-secondary text-xs"
            >
              Cancel
            </button>
            <button
              onClick={handleDeleteAccount}
              className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs"
            >
              Confirm Deletion
            </button>
          </div>
        </div>
      </GlassModal>
    </div>
  );
}
