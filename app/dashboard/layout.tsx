'use client';

import React, { useEffect } from 'react';
import Sidebar from '@/components/Navigation/Sidebar';
import MobileTabBar from '@/components/Navigation/MobileTabBar';
import { useApp } from '@/lib/context';
import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, authLoading, profile, signOut } = useApp();
  const router = useRouter();

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
    <div className="flex min-h-screen bg-black text-neutral-100">
      {/* Desktop Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 pb-24 lg:pb-10">
        {/* Top Header Bar */}
        <header className="sticky top-0 z-30 px-4 lg:px-8 py-3.5 bg-black/90 backdrop-blur-md border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-neutral-300">
              البكالوريا المصرية • Baccalaureate
            </span>
            <span className="text-neutral-700">•</span>
            <span className="text-xs text-neutral-300 font-medium">
              {profile?.full_name || user.email}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleSignOut}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-[#111111] hover:bg-[#1a1a1a] border border-white/10 text-neutral-300 hover:text-white transition-all cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
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
