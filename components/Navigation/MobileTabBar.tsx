'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Calendar,
  CheckSquare,
  Clock,
  Flame,
  Menu,
  X,
  Award,
  Layers,
  BrainCircuit,
  Sparkles,
  FileText,
  Settings,
} from 'lucide-react';

const MAIN_TABS = [
  { href: '/dashboard', label: 'Today', icon: Calendar },
  { href: '/dashboard/assignments', label: 'Tasks', icon: CheckSquare },
  { href: '/dashboard/exams', label: 'Exams', icon: Clock },
  { href: '/dashboard/pomodoro', label: 'Focus', icon: Flame },
];

const MORE_ITEMS = [
  { href: '/dashboard/grades', label: 'Grade Tracker', icon: Award, desc: 'Weighted scores & what-if calculator' },
  { href: '/dashboard/planner', label: 'Study Planner', icon: Layers, desc: 'Weekly schedule & study hours' },
  { href: '/dashboard/flashcards', label: 'Flashcards & Quiz', icon: BrainCircuit, desc: '3D review mode & missed cards' },
  { href: '/dashboard/habits', label: 'Habits & Sleep', icon: Sparkles, desc: 'Sleep log & daily streaks' },
  { href: '/dashboard/notes', label: 'Quick Notes', icon: FileText, desc: 'Sticky notes & pinned formulas' },
  { href: '/dashboard/settings', label: 'Settings & Bot', icon: Settings, desc: 'Telegram bot link & account' },
];

export default function MobileTabBar() {
  const pathname = usePathname();
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  return (
    <>
      {/* Slide-up "More" Sheet */}
      {showMoreMenu && (
        <div className="fixed inset-0 z-50 lg:hidden flex flex-col justify-end bg-black/70 backdrop-blur-md animate-fadeIn">
          <div
            className="absolute inset-0"
            onClick={() => setShowMoreMenu(false)}
          />

          <div className="relative glass-panel rounded-t-3xl border-t border-white/15 p-6 space-y-4 max-h-[80vh] overflow-y-auto z-10 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h2 className="text-base font-bold text-white">All Modules</h2>
              <button
                onClick={() => setShowMoreMenu(false)}
                className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-slate-300"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-2.5">
              {MORE_ITEMS.map((item) => {
                const Icon = item.icon;
                const isActive = pathname?.startsWith(item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setShowMoreMenu(false)}
                    className={`flex items-center gap-3.5 p-3 rounded-2xl transition-all ${
                      isActive
                        ? 'bg-cyan-500/15 border border-cyan-400/40 text-cyan-300'
                        : 'bg-white/[0.03] border border-white/5 text-slate-300 hover:bg-white/[0.06]'
                    }`}
                  >
                    <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                      <Icon className="w-5 h-5 text-cyan-400" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-white">{item.label}</h3>
                      <p className="text-xs text-slate-400">{item.desc}</p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Floating Glass Bottom Tab Bar */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 p-3 pointer-events-none">
        <div className="glass-panel rounded-3xl mx-auto max-w-md px-3 py-2 flex items-center justify-around border border-white/15 shadow-2xl pointer-events-auto backdrop-blur-2xl">
          {MAIN_TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive =
              tab.href === '/dashboard'
                ? pathname === '/dashboard'
                : pathname?.startsWith(tab.href);

            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`flex flex-col items-center gap-1 py-1 px-3 rounded-2xl transition-all ${
                  isActive
                    ? 'text-cyan-400 font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <div
                  className={`p-1.5 rounded-xl transition-all ${
                    isActive
                      ? 'bg-cyan-400/15 shadow-[0_0_12px_rgba(0,240,255,0.25)]'
                      : ''
                  }`}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <span className="text-[10px] tracking-tight">{tab.label}</span>
              </Link>
            );
          })}

          {/* More Menu Trigger */}
          <button
            onClick={() => setShowMoreMenu(true)}
            className={`flex flex-col items-center gap-1 py-1 px-3 rounded-2xl transition-all ${
              showMoreMenu
                ? 'text-cyan-400 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <div className="p-1.5 rounded-xl">
              <Menu className="w-5 h-5" />
            </div>
            <span className="text-[10px] tracking-tight">More</span>
          </button>
        </div>
      </nav>
    </>
  );
}
