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
  Settings,
  Sparkles,
  BrainCircuit,
  LogOut,
} from 'lucide-react';
import { useApp } from '@/lib/context';

export const NAV_ITEMS = [
  { href: '/dashboard', label: 'Today View', icon: Calendar },
  { href: '/dashboard/assignments', label: 'Assignments', icon: CheckSquare },
  { href: '/dashboard/exams', label: 'Exam Countdown', icon: Clock },
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
  const router = useRouter();
  const { profile, user, signOut } = useApp();

  const handleSignOut = async () => {
    await signOut();
    router.push('/login');
  };

  return (
    <aside className="hidden lg:flex flex-col w-64 shrink-0 p-4 h-screen sticky top-0 bg-black">
      <div className="bg-[#0a0a0a] rounded-2xl p-5 flex flex-col h-full overflow-hidden border border-white/10 shadow-xl">
        {/* Brand Header */}
        <div className="flex items-center gap-3 px-2 py-2 mb-6 border-b border-white/5 pb-4">
          <div className="w-8 h-8 rounded-xl bg-white text-black flex items-center justify-center font-black text-sm">
            B
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight text-white">
              البكالوريا
            </h1>
            <p className="text-[10px] text-neutral-400 font-medium">Baccalaureate</p>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 space-y-1 overflow-y-auto pr-1">
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
                <span>{item.label}</span>
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
            title="Sign Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
