'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Calendar,
  CheckSquare,
  Clock,
  Award,
  Layers,
  Flame,
  FileText,
  Settings,
  Sparkles,
  Bot,
  BrainCircuit,
  GraduationCap,
} from 'lucide-react';
import { useApp } from '@/lib/context';

export const NAV_ITEMS = [
  { href: '/dashboard', label: 'Today View', icon: Calendar, badge: 'Daily' },
  { href: '/dashboard/assignments', label: 'Assignments', icon: CheckSquare },
  { href: '/dashboard/exams', label: 'Exam Countdown', icon: Clock, glow: true },
  { href: '/dashboard/grades', label: 'Grade Tracker', icon: Award },
  { href: '/dashboard/planner', label: 'Study Planner', icon: Layers },
  { href: '/dashboard/pomodoro', label: 'Pomodoro Focus', icon: Flame },
  { href: '/dashboard/flashcards', label: 'Flashcards & Quiz', icon: BrainCircuit },
  { href: '/dashboard/habits', label: 'Habit Tracker', icon: Sparkles },
  { href: '/dashboard/notes', label: 'Quick Notes', icon: FileText },
  { href: '/dashboard/settings', label: 'Settings & Bot', icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { profile, isConfigured } = useApp();

  return (
    <aside className="hidden lg:flex flex-col w-64 xl:w-72 shrink-0 p-4 h-screen sticky top-0">
      <div className="glass-panel rounded-3xl p-5 flex flex-col h-full overflow-hidden border border-white/10 shadow-2xl relative">
        {/* Specular Edge Highlight */}
        <div className="absolute top-0 left-6 right-6 h-[1px] bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent pointer-events-none" />

        {/* Brand Header */}
        <div className="flex items-center gap-3 px-2 py-2 mb-6">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-slate-950 shadow-[0_0_20px_rgba(0,240,255,0.4)]">
            <GraduationCap className="w-5 h-5 text-black stroke-[2.5]" />
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight text-white flex items-center gap-1.5">
              Thanaweya
              <span className="text-[10px] font-semibold tracking-wider uppercase px-1.5 py-0.5 rounded-full bg-cyan-400/15 text-cyan-300 border border-cyan-400/30">
                PRO
              </span>
            </h1>
            <p className="text-xs text-slate-400 font-medium">منصة طالب الثانوية</p>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 space-y-1.5 overflow-y-auto pr-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.href === '/dashboard'
                ? pathname === '/dashboard'
                : pathname?.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`group flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-sm font-medium transition-all duration-200 relative ${
                  isActive
                    ? 'bg-gradient-to-r from-cyan-500/15 to-blue-500/10 text-cyan-300 border border-cyan-400/30 shadow-[0_0_15px_rgba(0,240,255,0.15)]'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-white/[0.04] border border-transparent'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={`w-4 h-4 transition-transform duration-200 group-hover:scale-110 ${
                      isActive ? 'text-cyan-400' : 'text-slate-400 group-hover:text-slate-200'
                    }`}
                  />
                  <span>{item.label}</span>
                </div>

                {item.glow && (
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse shadow-[0_0_8px_rgba(244,63,94,0.8)]" />
                )}

                {item.badge && !isActive && (
                  <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded-md bg-white/5 text-slate-400 border border-white/10">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Telegram Bot Indicator Card */}
        <div className="mt-4 p-3 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-cyan-500/30 transition-all">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Bot className="w-3.5 h-3.5 text-cyan-400" />
              Telegram Memory Bot
            </span>
            <span className="text-[10px] text-cyan-400 font-mono">Gemini AI</span>
          </div>
          <p className="text-[11px] text-slate-400 line-clamp-1 mb-2">
            Send voice/text notes to sync directly.
          </p>
          <Link
            href="/dashboard/settings"
            className="block text-center py-1.5 px-2 rounded-xl text-xs font-medium bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/20 transition-all"
          >
            Manage Bot Link →
          </Link>
        </div>

        {/* User Mini Profile */}
        <div className="mt-3 pt-3 border-t border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center font-bold text-xs text-white shrink-0">
              {profile.full_name?.charAt(0) || 'A'}
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-semibold text-white truncate">{profile.full_name}</p>
              <p className="text-[10px] text-slate-400">Target: {profile.target_percentage}%</p>
            </div>
          </div>
          <div
            title={isConfigured ? 'Supabase Connected' : 'Demo / Local Mode'}
            className={`w-2 h-2 rounded-full ${
              isConfigured ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]' : 'bg-cyan-400 shadow-[0_0_8px_rgba(56,189,248,0.8)]'
            }`}
          />
        </div>
      </div>
    </aside>
  );
}
