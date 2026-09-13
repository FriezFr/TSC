'use client';

import React, { useEffect, useState } from 'react';
import Sidebar from '@/components/Navigation/Sidebar';
import MobileTabBar from '@/components/Navigation/MobileTabBar';
import { useApp } from '@/lib/context';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { LogOut, Bot, Send, Sparkles } from 'lucide-react';
import ScheduleImportModal from '@/components/ScheduleImporter/ScheduleImportModal';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, authLoading, profile, signOut, language } = useApp();
  const router = useRouter();
  const [isImporterOpen, setIsImporterOpen] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/login');
    }
  }, [user, authLoading, router]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const handleSignOut = async () => {
    await signOut();
    router.push('/login');
  };

  return (
    <div className="flex min-h-screen bg-black text-neutral-100 relative">
      {/* Desktop Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 pb-24 lg:pb-10">
        {/* Top Header Bar */}
        <header className="sticky top-0 z-30 px-4 lg:px-8 py-3 bg-black/90 backdrop-blur-md border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3">
            <span className="text-xs font-semibold text-neutral-300 hidden sm:inline">
              البكالوريا المصرية • Baccalaureate
            </span>
            <span className="text-neutral-700 hidden sm:inline">•</span>
            <span className="text-xs text-neutral-300 font-medium">
              {profile?.full_name || user.email}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Import Schedule AI Button */}
            <button
              onClick={() => setIsImporterOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-white text-black hover:bg-neutral-200 transition-all cursor-pointer shadow-sm shadow-white/20"
              title="Auto-import your study schedule with AI"
            >
              <Sparkles className="w-3.5 h-3.5 text-blue-600" />
              <span>{language === 'ar' ? 'استيراد الجدول' : 'Import Schedule'}</span>
            </button>

            {/* Direct AI Chat Shortcut */}
            <Link
              href="/dashboard/chat"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 text-blue-300 transition-all cursor-pointer"
            >
              <Bot className="w-3.5 h-3.5 text-blue-400" />
              <span>AI Chat</span>
            </Link>

            {/* Direct Telegram Bot Shortcut */}
            <a
              href="https://t.me/TSCTaskerBot"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/30 text-sky-300 transition-all cursor-pointer"
              title="Open @TSCTaskerBot in Telegram"
            >
              <Send className="w-3 h-3 text-sky-400" />
              <span>Telegram</span>
            </a>

            <button
              onClick={handleSignOut}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-[#111111] hover:bg-[#1a1a1a] border border-white/10 text-neutral-300 hover:text-white transition-all cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </header>

        {/* Page Children Content */}
        <main className="flex-1 px-4 lg:px-8 py-6 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>

      {/* Floating Quick AI Tutor Button (Easy to Open from anywhere) */}
      <Link
        href="/dashboard/chat"
        className="fixed bottom-20 lg:bottom-6 right-5 z-40 px-3.5 py-2 rounded-2xl bg-white text-black hover:bg-neutral-200 border border-white/20 shadow-2xl flex items-center gap-2 font-bold text-xs transition-all hover:scale-105 cursor-pointer select-none"
        title="Quick AI Study Chat"
      >
        <Bot className="w-4 h-4 text-blue-600" />
        <span className="hidden sm:inline">AI Tutor</span>
        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
      </Link>

      {/* Schedule Import Modal */}
      <ScheduleImportModal
        isOpen={isImporterOpen}
        onClose={() => setIsImporterOpen(false)}
      />

      {/* Mobile Floating Bottom Bar */}
      <MobileTabBar />
    </div>
  );
}
