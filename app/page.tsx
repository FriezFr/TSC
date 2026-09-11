'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/lib/context';

export default function RootPage() {
  const router = useRouter();
  const { user, authLoading } = useApp();

  useEffect(() => {
    if (!authLoading) {
      if (user) {
        router.replace('/dashboard');
      } else {
        router.replace('/login');
      }
    }
  }, [user, authLoading, router]);

  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
    </div>
  );
}
