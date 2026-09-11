'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Calendar,
  CheckSquare,
  Clock,
  Award,
  Layers,
  Flame,
  FileText,
  MessageSquare,
  Settings,
  Sparkles,
  BrainCircuit,
  LogOut,
  Globe,
} from 'lucide-react';
import { useApp } from '@/lib/context';
import { Translations } from '@/lib/i18n';

interface NavDef {
  href: string;
  key: keyof Translations;
  icon: React.ElementType;
}

export const NAV_DEFINITIONS: NavDef[] = [
  { href: '/dashboard', key: 'navToday', icon: Calendar },
  { href: '/dashboard/assignments', key: 'navAssignments', icon: CheckSquare },
  { href: '/dashboard/exams', key: 'navExams', icon: Clock },
  { href: '/dashboard/grades', key: 'navGrades', icon: Award },
  { href: '/dashboard/planner', key: 'navPlanner', icon: Layers },
  { href: '/dashboard/pomodoro', key: 'navPomodoro', icon: Flame },
  { href: '/dashboard/flashcards', key: 'navFlashcards', icon: BrainCircuit },
  { href: '/dashboard/habits', key: 'navHabits', icon: Sparkles },
  { href: '/dashboard/notes', key: 'navNotes', icon: FileText },
  { href: '/dashboard/chat', key: 'navChat', icon: MessageSquare },
  { href: '/dashboard/settings', key: 'navSettings', icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { profile, user, signOut, language, setLanguage, t } = useApp();

  const handleSignOut = async () => {
    await signOut();
    router.push('/login');
  };

  const toggleLanguage = () => {
    setLanguage(language === 'en' ? 'ar' : 'en');
  };

  return (
    <aside className="hidden lg:flex flex-col w-64 shrink-0 p-4 h-screen sticky top-0 bg-black">
      <div className="bg-[#0a0a0a] rounded-2xl p-5 flex flex-col h-full overflow-hidden border border-white/10 shadow-xl">
        {/* Brand Header */}
        <div className="flex items-center justify-between px-2 py-2 mb-6 border-b border-white/5 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-white text-black flex items-center justify-center font-black text-sm">
              B
            </div>
            <div>
              <h1 className="text-sm font-bold tracking-tight text-white">
                {t('brandName')}
              </h1>
              <p className="text-[10px] text-neutral-400 font-medium truncate max-w-[110px]">
                {language === 'ar' ? 'البكالوريا المصرية' : 'Baccalaureate'}
              </p>
            </div>
          </div>

          {/* Language Quick Toggle */}
          <button
            onClick={toggleLanguage}
            className="px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-neutral-300 hover:text-white text-[11px] font-mono font-bold flex items-center gap-1 border border-white/10 transition-all cursor-pointer"
            title={language === 'en' ? 'التبديل إلى العربية' : 'Switch to English'}
          >
            <Globe className="w-3 h-3 text-neutral-400" />
            <span>{language === 'en' ? 'عربي' : 'EN'}</span>
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 space-y-1 overflow-y-auto pr-1">
          {NAV_DEFINITIONS.map((item) => {
            const Icon = item.icon;
            const label = t(item.key);
            const isActive =
              item.href === '/dashboard'
                ? pathname === '/dashboard'
                : pathname?.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-[#1a1a1a] text-white border border-white/15 shadow-sm'
                    : 'text-neutral-400 hover:text-white hover:bg-white/[0.04]'
                }`}
              >
                <Icon
                  className={`w-4 h-4 ${
                    isActive ? 'text-white' : 'text-neutral-500'
                  }`}
                />
                <span>{label}</span>
              </Link>
            );
          })}
        </nav>

        {/* User Mini Profile & Sign Out */}
        <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-between">
          <div className="overflow-hidden">
            <p className="text-xs font-semibold text-white truncate">
              {profile?.full_name || 'Student'}
            </p>
            <p className="text-[10px] text-neutral-500 truncate">{user?.email}</p>
          </div>

          <button
            onClick={handleSignOut}
            className="p-1.5 rounded-lg text-neutral-500 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
            title={t('signOut')}
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
