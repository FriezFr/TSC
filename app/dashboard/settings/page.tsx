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
  Code,
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
    signOut,
  } = useApp();

  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedWebhook, setCopiedWebhook] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [passwordStatus, setPasswordStatus] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const host = typeof window !== 'undefined' ? window.location.origin : 'https://thanaweya-dashboard.vercel.app';
  const webhookUrl = `${host}/api/telegram/webhook`;
  const setWebhookCurl = `https://api.telegram.org/bot8978477850:AAGzHRPqL-x2ftO-r_Nx-1dhtG6sxzC6ME4/setWebhook?url=${webhookUrl}`;

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
    if (!supabase) return;

    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setPasswordStatus('Password updated successfully.');
      setNewPassword('');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error updating password';
      setPasswordStatus(`Failed: ${msg}`);
    }
  };

  const handleLogout = async () => {
    await signOut();
    router.push('/login');
  };

  const handleDeleteAccount = async () => {
    const supabase = getSupabaseClient();
    if (supabase) {
      await supabase.auth.signOut();
    }
    setIsDeleteModalOpen(false);
    router.push('/login');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">
          Settings
        </h1>
        <p className="text-xs text-neutral-400 mt-1">
          Account security and Telegram Memory Bot integration.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Telegram Bot */}
        <div className="lg:col-span-2 space-y-6">
          <GlassCard className="p-6 space-y-6">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white text-black flex items-center justify-center font-bold">
                  <Bot className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white">
                    Telegram Memory Bot
                  </h2>
                  <p className="text-xs text-neutral-400 mt-0.5">
                    Send voice or text messages to your bot for Gemini to parse and log.
                  </p>
                </div>
              </div>

              <div
                className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                  telegramLinked
                    ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                    : 'bg-[#141414] text-neutral-400 border border-white/10'
                }`}
              >
                {telegramLinked ? 'Linked' : 'Not Linked'}
              </div>
            </div>

            {/* Link Code */}
            <div className="p-4 rounded-xl bg-[#111111] border border-white/10 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-neutral-300">Your One-Time Link Code</span>
                <button
                  onClick={handleGenerateNewCode}
                  disabled={isGenerating}
                  className="text-xs text-neutral-400 hover:text-white flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isGenerating ? 'animate-spin' : ''}`} />
                  Generate Code
                </button>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex-1 glass-input py-2.5 px-4 rounded-xl text-center text-2xl sm:text-3xl font-bold font-mono tracking-widest text-white select-all">
                  {telegramCode || 'Click Generate'}
                </div>

                <button
                  onClick={handleCopyCode}
                  disabled={!telegramCode}
                  className="p-3 rounded-xl glass-button-primary shrink-0 cursor-pointer disabled:opacity-50"
                  title="Copy code"
                >
                  {copiedCode ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>

              <p className="text-[11px] text-neutral-400">
                Send <code className="text-white font-mono">/start {telegramCode || '<code>'}</code> to your bot in Telegram to link.
              </p>
            </div>

            {/* Webhook */}
            <div className="p-3.5 rounded-xl bg-[#111111] border border-white/10 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-neutral-300 flex items-center gap-1.5">
                  <Code className="w-3.5 h-3.5" />
                  Webhook Endpoint
                </span>
                <button
                  onClick={handleCopyWebhook}
                  className="text-xs text-neutral-400 hover:text-white flex items-center gap-1 cursor-pointer"
                >
                  {copiedWebhook ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>Copy</span>
                </button>
              </div>
              <div className="p-2 rounded-lg bg-black font-mono text-[11px] text-neutral-300 break-all select-all">
                {webhookUrl}
              </div>
            </div>
          </GlassCard>

          {/* Profile Settings */}
          {profile && (
            <GlassCard className="p-5 space-y-4">
              <h3 className="text-sm font-bold text-white">Student Profile</h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1">
                    Name
                  </label>
                  <input
                    type="text"
                    value={profile.full_name}
                    onChange={(e) => updateProfile({ full_name: e.target.value })}
                    className="w-full glass-input px-3 py-2 rounded-xl text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1">
                    المسار التخصصي (Track)
                  </label>
                  <select
                    value={profile.study_division}
                    onChange={(e) => updateProfile({ study_division: e.target.value as any })}
                    className="w-full glass-input px-3 py-2 rounded-xl text-xs bg-[#0d0d0d] text-white"
                  >
                    <option value="medical_life_sciences">مسار الطب وعلوم الحياة (Medical)</option>
                    <option value="engineering_cs">مسار الهندسة وعلوم الحاسب (Engineering & CS)</option>
                    <option value="business">مسار الأعمال والإدارة (Business)</option>
                    <option value="humanities_arts">مسار الآداب والعلوم الإنسانية (Humanities)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1">
                    Target %
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="50"
                    max="100"
                    value={profile.target_percentage}
                    onChange={(e) => updateProfile({ target_percentage: Number(e.target.value) })}
                    className="w-full glass-input px-3 py-2 rounded-xl text-xs font-mono"
                  />
                </div>
              </div>
            </GlassCard>
          )}
        </div>

        {/* Security / Account Actions */}
        <div className="space-y-6">
          <GlassCard className="p-5 space-y-3">
            <div className="flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-white" />
              <h3 className="text-sm font-bold text-white">Change Password</h3>
            </div>

            {passwordStatus && (
              <p className="text-xs text-neutral-300 p-2 rounded-lg bg-[#141414] border border-white/10">
                {passwordStatus}
              </p>
            )}

            <form onSubmit={handleChangePassword} className="space-y-2.5">
              <input
                type="password"
                required
                minLength={6}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full glass-input px-3 py-2 rounded-xl text-xs"
              />
              <button
                type="submit"
                className="w-full py-2 rounded-xl glass-button-secondary text-xs font-semibold cursor-pointer"
              >
                Update Password
              </button>
            </form>
          </GlassCard>

          <GlassCard className="p-5 space-y-3 border border-red-900/30">
            <h3 className="text-sm font-bold text-red-400">Account</h3>

            <button
              onClick={handleLogout}
              className="w-full py-2 rounded-xl bg-[#111111] hover:bg-[#1a1a1a] text-neutral-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Log Out</span>
            </button>

            <button
              onClick={() => setIsDeleteModalOpen(true)}
              className="w-full py-2 rounded-xl bg-red-950/30 hover:bg-red-950/60 text-red-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete Account</span>
            </button>
          </GlassCard>
        </div>
      </div>

      <GlassModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Delete Account"
      >
        <div className="space-y-4 text-xs text-neutral-300">
          <p>Are you sure you want to sign out and clear your session?</p>
          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={() => setIsDeleteModalOpen(false)}
              className="px-4 py-2 rounded-xl glass-button-secondary text-xs cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleDeleteAccount}
              className="px-4 py-2 rounded-xl bg-red-600 text-white font-bold text-xs cursor-pointer"
            >
              Confirm
            </button>
          </div>
        </div>
      </GlassModal>
    </div>
  );
}
