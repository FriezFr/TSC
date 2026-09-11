import type { Metadata, Viewport } from 'next';
import './globals.css';
import { AppProvider } from '@/lib/context';

export const metadata: Metadata = {
  title: 'Thanaweya Dashboard — منصة طالب الثانوية العامة',
  description:
    'Apple dark liquid glass productivity suite tailored for Egyptian Thanaweya Amma students. Timetable, assignments, exams, grades, planner, pomodoro, flashcards, habits, notes, and Gemini-powered Telegram memory bot.',
  keywords: [
    'Thanaweya Amma',
    'ثانوية عامة',
    'Egyptian high school',
    'Study dashboard',
    'Pomodoro',
    'Exam countdown',
    'Liquid glass',
  ],
  authors: [{ name: 'Thanaweya Dashboard Team' }],
  icons: {
    icon: '/favicon.ico',
  },
};

export const viewport: Viewport = {
  themeColor: '#07090e',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ar" dir="ltr" className="dark h-full bg-[#07090e]">
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body className="min-h-full flex flex-col bg-liquid-mesh text-slate-100 antialiased selection:bg-cyan-500/30 selection:text-cyan-200">
        <AppProvider>{children}</AppProvider>
      </body>
    </html>
  );
}
