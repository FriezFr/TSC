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
  Globe,
} from 'lucide-react';
import { useApp } from '@/lib/context';
import { Translations } from '@/lib/i18n';

interface TabDef {
  href: string;
  key: keyof Translations;
  icon: React.ElementType;
}

const MAIN_TABS: TabDef[] = [
  { href: '/dashboard', key: 'navToday', icon: Calendar },
  { href: '/dashboard/assignments', key: 'navAssignments', icon: CheckSquare },
  { href: '/dashboard/exams', key: 'navExams', icon: Clock },
  { href: '/dashboard/pomodoro', key: 'navPomodoro', icon: Flame },
];

const MORE_ITEMS: TabDef[] = [
  { href: '/dashboard/grades', key: 'navGrades', icon: Award },
  { href: '/dashboard/planner', key: 'navPlanner', icon: Layers },
  { href: '/dashboard/flashcards', key: 'navFlashcards', icon: BrainCircuit },
  { href: '/dashboard/habits', key: 'navHabits', icon: Sparkles },
  { href: '/dashboard/notes', key: 'navNotes', icon: FileText },
  { href: '/dashboard/settings', key: 'navSettings', icon: Settings },
];

export default function MobileTabBar() {
  const pathname = usePathname();
  const { language, setLanguage, t } = useApp();
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  const toggleLanguage = () => {
    setLanguage(language === 'en' ? 'ar' : 'en');
  };

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
              <h2 className="text-sm font-bold text-white">{t('more')}</h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={toggleLanguage}
                  className="px-2.5 py-1 rounded-lg bg-white/10 text-xs font-bold text-white flex items-center gap-1.5 cursor-pointer"
                >
                  <Globe className="w-3.5 h-3.5" />
                  <span>{language === 'en' ? 'العربية' : 'English'}</span>
                </button>
                <button
                  onClick={() => setShowMoreMenu(false)}
                  className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center text-neutral-400 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
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
                    <span className="text-xs font-semibold">{t(item.key)}</span>
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
                <span className="text-[10px] truncate max-w-[64px]">{t(tab.key)}</span>
              </Link>
            );
          })}

          <button
            onClick={() => setShowMoreMenu(true)}
            className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-all cursor-pointer ${
              showMoreMenu ? 'text-white' : 'text-neutral-500 hover:text-neutral-300'
            }`}
          >
            <Menu className="w-4 h-4" />
            <span className="text-[10px]">{t('more')}</span>
          </button>
        </div>
      </nav>
    </>
  );
}
