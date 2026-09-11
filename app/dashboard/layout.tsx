'use client';

import React from 'react';
import Sidebar from '@/components/Navigation/Sidebar';
import MobileTabBar from '@/components/Navigation/MobileTabBar';
import { useApp } from '@/lib/context';
import { Sparkles, Bot, AlertCircle } from 'lucide-react';
import Link from 'next/link';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isConfigured, isDemoMode } = useApp();

  return (
    <div className="flex min-h-screen bg-liquid-mesh text-slate-100">
      {/* Desktop Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 pb-24 lg:pb-10">
        {/* Top Header Bar */}
        <header className="sticky top-0 z-30 px-4 lg:px-8 py-3.5 backdrop-blur-xl bg-[#07090e]/60 border-b border-white/[0.06] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-slate-400">
              Thanaweya Amma 2025/2026
            </span>
            <span className="hidden sm:inline-block text-slate-600">•</span>
            <span className="hidden sm:flex items-center gap-1.5 text-xs text-cyan-400 bg-cyan-500/10 px-2.5 py-0.5 rounded-full border border-cyan-500/20">
              <Sparkles className="w-3 h-3" />
              Focus Mode Active
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            {!isConfigured && (
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs bg-amber-500/10 border border-amber-500/25 text-amber-300">
                <AlertCircle className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Preview Mode</span>
                <Link
                  href="/dashboard/settings"
                  className="underline ml-1 font-medium hover:text-white"
                >
                  Setup Supabase
                </Link>
              </div>
            )}

            <Link
              href="/dashboard/settings"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl text-xs font-medium bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-slate-300 hover:text-white transition-all shadow-sm"
            >
              <Bot className="w-3.5 h-3.5 text-cyan-400" />
              <span>Sync Bot</span>
            </Link>
          </div>
        </header>

        {/* Page Children Content */}
        <main className="flex-1 px-4 lg:px-8 py-6 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>

      {/* Mobile Floating Bottom Bar */}
      <MobileTabBar />
    </div>
  );
}
