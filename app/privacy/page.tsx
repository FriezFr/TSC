import React from 'react';
import Link from 'next/link';

export const metadata = {
  title: 'Privacy Policy • TSC AI',
  description: 'Privacy Policy for TSC (The Student Companion) and WhatsApp/Telegram study integrations.',
};

export default function PrivacyPolicyPage() {
  return (
    <main className="min-h-screen bg-black text-neutral-100 py-16 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <Link
          href="/"
          className="text-xs text-neutral-400 hover:text-white transition-colors"
        >
          ← Back to TSC
        </Link>
        <h1 className="text-3xl font-bold mt-4 text-white">Privacy Policy</h1>
        <p className="text-xs text-neutral-400 mt-1">Last Updated: September 14, 2026</p>
      </div>

      <div className="space-y-6 text-sm text-neutral-300 leading-relaxed bg-[#111111] p-6 sm:p-8 rounded-2xl border border-white/10">
        <section className="space-y-2">
          <h2 className="text-base font-semibold text-white">1. Overview</h2>
          <p>
            TSC (&quot;The Student Companion&quot;, &quot;we&quot;, &quot;our&quot;) is an AI-powered school operating system designed to assist students in organizing timetables, tracking assignments, practicing flashcards, and studying with AI assistance through web dashboards and connected messaging platforms (WhatsApp and Telegram).
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-white">2. Information We Collect</h2>
          <p>
            We only collect information strictly necessary to provide academic assistance:
          </p>
          <ul className="list-disc pl-5 space-y-1 text-xs text-neutral-400">
            <li><strong>Account Information:</strong> Name, email address, academic track, and target percentage.</li>
            <li><strong>Academic Data:</strong> Class schedules, homework assignments, exam dates, study sessions, and flashcards.</li>
            <li><strong>Messaging Data:</strong> Phone number (for WhatsApp) or Chat ID (for Telegram) used solely to link your messaging account to your student timetable and respond to study queries.</li>
            <li><strong>Study Content:</strong> Messages, photos, or documents sent to the assistant to solve questions or summarize lessons.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-white">3. How We Use Information</h2>
          <p>
            Your information is used solely to:
          </p>
          <ul className="list-disc pl-5 space-y-1 text-xs text-neutral-400">
            <li>Deliver real-time timetable reminders, study recommendations, and homework alerts.</li>
            <li>Process and answer your academic questions and summarize study documents using AI.</li>
            <li>Track your study sessions and Pomodoro focus cycles.</li>
          </ul>
          <p className="text-xs text-neutral-400 mt-2">
            We do not sell, rent, or monetize personal student information, nor do we share it with third parties for marketing purposes.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-white">4. Data Security & Retention</h2>
          <p>
            Data is stored securely using industry-standard encrypted databases with Row Level Security (RLS). You can disconnect your WhatsApp or Telegram integration at any time from your Account Settings.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-white">5. Contact</h2>
          <p>
            If you have questions regarding this Privacy Policy or your data, contact us at support@taskerbot.vercel.app.
          </p>
        </section>
      </div>
    </main>
  );
}
