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
  Languages,
  Globe,
  MessageCircle,
} from 'lucide-react';
import { getSupabaseClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { BACCALAUREATE_TRACKS } from '@/lib/types';

export default function SettingsPage() {
  const router = useRouter();
  const {
    profile,
    updateProfile,
    telegramCode,
    generateTelegramCode,
    telegramLinked,
    signOut,
    language,
    setLanguage,
    t,
  } = useApp();

  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedWebhook, setCopiedWebhook] = useState(false);
  const [copiedWhatsAppWebhook, setCopiedWhatsAppWebhook] = useState(false);
  const [copiedVerifyToken, setCopiedVerifyToken] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [passwordStatus, setPasswordStatus] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const host = typeof window !== 'undefined' ? window.location.origin : 'https://ttasker.vercel.app';
  const webhookUrl = `${host}/api/telegram/webhook`;
  const whatsappWebhookUrl = `${host}/api/whatsapp/webhook`;
  const whatsappVerifyToken = 'tsc_baccalaureate_whatsapp_2026';
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
      setPasswordStatus(language === 'ar' ? 'تم تحديث كلمة المرور بنجاح.' : 'Password updated successfully.');
      setNewPassword('');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error updating password';
      setPasswordStatus(`${language === 'ar' ? 'فشل التحديث' : 'Failed'}: ${msg}`);
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
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">
          {t('settingsTitle')}
        </h1>
        <p className="text-xs text-neutral-400 mt-1">
          {t('settingsDesc')}
        </p>
      </div>

      {/* Language & Localization Card */}
      <GlassCard className="p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white text-black flex items-center justify-center font-bold">
              <Languages className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white">
                  {t('languageSettings')}
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-white/10 text-neutral-300">
                  {language === 'en' ? 'EN' : 'AR'}
                </span>
              </div>
              <p className="text-xs text-neutral-400 mt-0.5">
                {t('languageDesc')}
              </p>
            </div>
          </div>

          {/* Dual Language Switcher Buttons */}
          <div className="grid grid-cols-2 p-1 rounded-xl bg-[#141414] border border-white/10 w-full sm:w-72">
            <button
              type="button"
              onClick={() => setLanguage('en')}
              className={`py-2 px-3 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer ${
                language === 'en'
                  ? 'bg-white text-black shadow-md'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <span>🇬🇧</span>
              <span>English</span>
              {language === 'en' && (
                <span className="text-[9px] px-1 py-0.2 rounded bg-black/10 font-normal">
                  {t('defaultBadge')}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setLanguage('ar')}
              className={`py-2 px-3 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer ${
                language === 'ar'
                  ? 'bg-white text-black shadow-md'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <span>🇪🇬</span>
              <span>العربية</span>
            </button>
          </div>
        </div>
      </GlassCard>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Telegram Bot & Student Profile (2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          <GlassCard className="p-6 space-y-6">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white text-black flex items-center justify-center font-bold">
                  <Bot className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white">
                    {t('telegramBotTitle')}
                  </h2>
                  <p className="text-xs text-neutral-400 mt-0.5">
                    {t('telegramBotDesc')}
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
                {telegramLinked ? t('statusLinked') : t('statusNotLinked')}
              </div>
            </div>

            {/* Link Code */}
            <div className="p-4 rounded-xl bg-[#111111] border border-white/10 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-neutral-300">{t('linkCodeLabel')}</span>
                <button
                  onClick={handleGenerateNewCode}
                  disabled={isGenerating}
                  className="text-xs text-neutral-400 hover:text-white flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isGenerating ? 'animate-spin' : ''}`} />
                  {t('generateCode')}
                </button>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex-1 glass-input py-2.5 px-4 rounded-xl text-center text-2xl sm:text-3xl font-bold font-mono tracking-widest text-white select-all">
                  {telegramCode || (language === 'ar' ? 'اضغط توليد رمز' : 'Click Generate')}
                </div>

                <button
                  onClick={handleCopyCode}
                  disabled={!telegramCode}
                  className="p-3 rounded-xl glass-button-primary shrink-0 cursor-pointer disabled:opacity-50"
                  title={t('copyCode')}
                >
                  {copiedCode ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>

              <p className="text-[11px] text-neutral-400">
                {language === 'ar' ? (
                  <>أرسل <code className="text-white font-mono">/start {telegramCode || '<code>'}</code> إلى البوت في تيليجرام لربط حسابك.</>
                ) : (
                  <>Send <code className="text-white font-mono">/start {telegramCode || '<code>'}</code> to @TSCTaskerBot in Telegram to link.</>
                )}
              </p>
            </div>

            {/* Webhook Endpoint */}
            <div className="p-3.5 rounded-xl bg-[#111111] border border-white/10 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-neutral-300 flex items-center gap-1.5">
                  <Code className="w-3.5 h-3.5" />
                  {t('webhookEndpoint')}
                </span>
                <button
                  onClick={handleCopyWebhook}
                  className="text-xs text-neutral-400 hover:text-white flex items-center gap-1 cursor-pointer"
                >
                  {copiedWebhook ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedWebhook ? t('copied') : t('copyWebhook')}</span>
                </button>
              </div>
              <div className="p-2 rounded-lg bg-black font-mono text-[11px] text-neutral-300 break-all select-all">
                {webhookUrl}
              </div>
            </div>
          </GlassCard>

          {/* WhatsApp Bot Card */}
          <GlassCard className="p-6 space-y-6">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500 text-black flex items-center justify-center font-bold shadow-md shadow-emerald-500/20">
                  <MessageCircle className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white flex items-center gap-2">
                    <span>بوت واتساب (TaskerBot WhatsApp)</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      Cloud API
                    </span>
                  </h2>
                  <p className="text-xs text-neutral-400 mt-0.5">
                    {language === 'ar'
                      ? 'استقبل وحول رسائل جروبات المدرسة إلى البوت لتسجيل الواجبات والحصص والامتحانات تلقائياً.'
                      : 'Forward school-group messages to automatically extract homework, exams, and lesson changes.'}
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
                {telegramLinked
                  ? (language === 'ar' ? 'حسابك مربوط' : 'Account Linked')
                  : (language === 'ar' ? 'جاهز للربط' : 'Ready to Link')}
              </div>
            </div>

            {/* How to link WhatsApp */}
            <div className="p-4 rounded-xl bg-[#111111] border border-white/10 space-y-3">
              <span className="text-xs font-bold text-white block">
                {language === 'ar' ? 'خطوات ربط حساب الواتساب:' : 'How to Link Your WhatsApp Account:'}
              </span>

              <ol className="space-y-2 text-xs text-neutral-300 list-decimal list-inside pl-1">
                <li>
                  {language === 'ar' ? (
                    <>استخدم كود الربط الخاص بك: <code className="px-2 py-0.5 rounded bg-white/10 font-mono font-bold text-white">{telegramCode || 'اضغط توليد رمز في كارت تيليجرام أعلاه'}</code></>
                  ) : (
                    <>Use your 6-digit sync code: <code className="px-2 py-0.5 rounded bg-white/10 font-mono font-bold text-white">{telegramCode || 'Click Generate Code above'}</code></>
                  )}
                </li>
                <li>
                  {language === 'ar' ? (
                    <>أرسل رسالة واتساب للرقم المخصص للبوت نصها: <code className="px-2 py-0.5 rounded bg-white/10 font-mono font-bold text-emerald-300">start {telegramCode || 'CODE'}</code></>
                  ) : (
                    <>Send a WhatsApp message: <code className="px-2 py-0.5 rounded bg-white/10 font-mono font-bold text-emerald-300">start {telegramCode || 'CODE'}</code></>
                  )}
                </li>
                <li>
                  {language === 'ar'
                    ? 'بعدها حوّل أي رسالة من جروب المدرسة للرقم، والذكاء الاصطناعي هيصفي الرغي ويسجل المفيد فوراً!'
                    : 'Forward any message from your school WhatsApp group to automatically log tasks!'}
                </li>
              </ol>
            </div>

            {/* Webhook & Meta Setup details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-[#111111] border border-white/10 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-neutral-300">WhatsApp Webhook URL</span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(whatsappWebhookUrl);
                      setCopiedWhatsAppWebhook(true);
                      setTimeout(() => setCopiedWhatsAppWebhook(false), 2000);
                    }}
                    className="text-[10px] text-neutral-400 hover:text-white flex items-center gap-1 cursor-pointer"
                  >
                    {copiedWhatsAppWebhook ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedWhatsAppWebhook ? (language === 'ar' ? 'تم النسخ' : 'Copied') : (language === 'ar' ? 'نسخ' : 'Copy')}</span>
                  </button>
                </div>
                <div className="p-2 rounded-lg bg-black font-mono text-[10px] text-neutral-300 break-all select-all">
                  {whatsappWebhookUrl}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-[#111111] border border-white/10 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-neutral-300">Verify Token</span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(whatsappVerifyToken);
                      setCopiedVerifyToken(true);
                      setTimeout(() => setCopiedVerifyToken(false), 2000);
                    }}
                    className="text-[10px] text-neutral-400 hover:text-white flex items-center gap-1 cursor-pointer"
                  >
                    {copiedVerifyToken ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedVerifyToken ? (language === 'ar' ? 'تم النسخ' : 'Copied') : (language === 'ar' ? 'نسخ' : 'Copy')}</span>
                  </button>
                </div>
                <div className="p-2 rounded-lg bg-black font-mono text-[10px] text-neutral-300 break-all select-all">
                  {whatsappVerifyToken}
                </div>
              </div>
            </div>
          </GlassCard>

          {/* Profile Settings */}
          {profile && (
            <GlassCard className="p-5 space-y-4">
              <h3 className="text-sm font-bold text-white">{t('studentProfile')}</h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1">
                    {t('fullName')}
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
                    {t('trackLabel')}
                  </label>
                  <select
                    value={profile.study_division}
                    onChange={(e) => updateProfile({ study_division: e.target.value as any })}
                    className="w-full glass-input px-3 py-2 rounded-xl text-xs bg-[#0d0d0d] text-white"
                  >
                    {BACCALAUREATE_TRACKS.map((trk) => (
                      <option key={trk.id} value={trk.id}>
                        {language === 'ar' ? `${trk.name} (${trk.en})` : `${trk.en} (${trk.name})`}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1">
                    {t('targetPercentage')}
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

        {/* Security / Account Actions (1 col) */}
        <div className="space-y-6">
          <GlassCard className="p-5 space-y-3">
            <div className="flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-white" />
              <h3 className="text-sm font-bold text-white">{t('changePassword')}</h3>
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
                {t('updatePassword')}
              </button>
            </form>
          </GlassCard>

          <GlassCard className="p-5 space-y-3 border border-red-900/30">
            <h3 className="text-sm font-bold text-red-400">{t('accountSection')}</h3>

            <button
              onClick={handleLogout}
              className="w-full py-2 rounded-xl bg-[#111111] hover:bg-[#1a1a1a] text-neutral-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>{t('signOut')}</span>
            </button>

            <button
              onClick={() => setIsDeleteModalOpen(true)}
              className="w-full py-2 rounded-xl bg-red-950/30 hover:bg-red-950/60 text-red-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{t('deleteAccount')}</span>
            </button>
          </GlassCard>
        </div>
      </div>

      <GlassModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title={t('deleteAccount')}
      >
        <div className="space-y-4 text-xs text-neutral-300">
          <p>{t('deleteAccountConfirm')}</p>
          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={() => setIsDeleteModalOpen(false)}
              className="px-4 py-2 rounded-xl glass-button-secondary text-xs cursor-pointer"
            >
              {t('cancel')}
            </button>
            <button
              onClick={handleDeleteAccount}
              className="px-4 py-2 rounded-xl bg-red-600 text-white font-bold text-xs cursor-pointer"
            >
              {t('confirm')}
            </button>
          </div>
        </div>
      </GlassModal>
    </div>
  );
}
