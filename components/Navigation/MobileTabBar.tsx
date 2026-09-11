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
  { href: '/dashboard/grades', label: 'Grade Tracker', icon: Award },
  { href: '/dashboard/planner', label: 'Study Planner', icon: Layers },
  { href: '/dashboard/flashcards', label: 'Flashcards & Quiz', icon: BrainCircuit },
  { href: '/dashboard/habits', label: 'Habits & Sleep', icon: Sparkles },
  { href: '/dashboard/notes', label: 'Quick Notes', icon: FileText },
  { href: '/dashboard/settings', label: 'Settings & Bot', icon: Settings },
];

export default function MobileTabBar() {
  const pathname = usePathname();
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  return (
    <>
      {showMoreMenu && (
        <div className="fixed inset-0 z-50 lg:hidden flex flex-col justify-end bg-black/80 backdrop-blur-md">
          <div
            className="absolute inset-0"
            onClick={() => setShowMoreMenu(false)}
          />

          <div className="relative bg-[#0c0c0c] rounded-t-2xl border-t border-white/10 p-6 space-y-4 max-h-[80vh] overflow-y-auto z-10">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h2 className="text-sm font-bold text-white">Menu</h2>
              <button
                onClick={() => setShowMoreMenu(false)}
                className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center text-neutral-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-2">
              {MORE_ITEMS.map((item) => {
                const Icon = item.icon;
                const isActive = pathname?.startsWith(item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setShowMoreMenu(false)}
                    className={`flex items-center gap-3 p-3 rounded-xl transition-all ${
                      isActive
                        ? 'bg-[#1a1a1a] text-white border border-white/20'
                        : 'bg-[#111111] text-neutral-300 hover:bg-[#161616]'
                    }`}
                  >
                    <Icon className="w-4 h-4 text-white" />
                    <span className="text-xs font-semibold">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Floating Bottom Tab Bar */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 p-3 pointer-events-none">
        <div className="bg-[#0c0c0c]/95 backdrop-blur-lg rounded-2xl mx-auto max-w-md px-3 py-2 flex items-center justify-around border border-white/10 shadow-2xl pointer-events-auto">
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
                className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-all ${
                  isActive ? 'text-white font-bold' : 'text-neutral-500 hover:text-neutral-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="text-[10px]">{tab.label}</span>
              </Link>
            );
          })}

          <button
            onClick={() => setShowMoreMenu(true)}
            className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-all ${
              showMoreMenu ? 'text-white' : 'text-neutral-500 hover:text-neutral-300'
            }`}
          >
            <Menu className="w-4 h-4" />
            <span className="text-[10px]">More</span>
          </button>
        </div>
      </nav>
    </>
  );
}
