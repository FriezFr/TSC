'use client';

import React from 'react';
import Link from 'next/link';
import {
  GraduationCap,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Clock,
  Award,
  Bot,
  Flame,
  Layers,
  BrainCircuit,
} from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-liquid-mesh text-slate-100 flex flex-col justify-between p-6 lg:p-12 relative overflow-hidden">
      {/* Background ambient orbs */}
      <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-cyan-500/15 blur-[120px] pointer-events-none" />
      <div className="absolute top-1/2 -right-40 w-96 h-96 rounded-full bg-indigo-500/15 blur-[120px] pointer-events-none" />

      {/* Top Bar */}
      <header className="max-w-6xl w-full mx-auto flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-slate-950 shadow-[0_0_20px_rgba(0,240,255,0.4)]">
            <GraduationCap className="w-5 h-5 text-black stroke-[2.5]" />
          </div>
          <div>
            <span className="text-lg font-bold tracking-tight text-white">Thanaweya</span>
            <span className="text-xs text-cyan-400 font-medium ml-1.5 px-2 py-0.5 rounded-full bg-cyan-400/10 border border-cyan-400/20">
              Dashboard
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="text-xs font-semibold px-4 py-2 rounded-2xl text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 transition-all"
          >
            Login / Signup
          </Link>
          <Link
            href="/dashboard"
            className="text-xs font-semibold px-4 py-2 rounded-2xl glass-button-primary flex items-center gap-1.5 transition-all"
          >
            <span>Open App</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-5xl w-full mx-auto my-auto py-12 z-10 text-center space-y-8">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.04] border border-white/10 text-cyan-300 text-xs font-medium shadow-inner">
          <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
          <span>Designed for Egyptian Thanaweya Amma Students</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-white leading-tight">
          Master Your Thanaweya Year in{' '}
          <span className="bg-gradient-to-r from-cyan-400 via-sky-300 to-indigo-400 bg-clip-text text-transparent">
            Liquid Glass Precision.
          </span>
        </h1>

        <p className="max-w-2xl mx-auto text-base sm:text-lg text-slate-400 leading-relaxed font-normal">
          From weighted exam target calculators and weekly class timetables to an integrated
          Gemini-powered Telegram Memory Bot. Everything in one Apple-dark frosted dashboard.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
          <Link
            href="/dashboard"
            className="w-full sm:w-auto px-7 py-3.5 rounded-2xl glass-button-primary text-sm font-bold flex items-center justify-center gap-2 shadow-[0_0_30px_rgba(0,240,255,0.35)]"
          >
            <span>Launch Dashboard Now</span>
            <ArrowRight className="w-4 h-4" />
          </Link>

          <Link
            href="/dashboard/settings"
            className="w-full sm:w-auto px-6 py-3.5 rounded-2xl glass-button-secondary text-sm font-semibold flex items-center justify-center gap-2"
          >
            <Bot className="w-4 h-4 text-cyan-400" />
            <span>Connect Telegram Bot</span>
          </Link>
        </div>

        {/* Feature Grid Pills */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-10 text-left">
          <div className="glass-panel p-4 rounded-2xl border border-white/10 hover:border-cyan-500/30 transition-all">
            <Clock className="w-5 h-5 text-cyan-400 mb-2" />
            <h3 className="text-sm font-bold text-white">Exam Countdown</h3>
            <p className="text-xs text-slate-400 mt-0.5">Live tickers with 7-day urgency glow</p>
          </div>

          <div className="glass-panel p-4 rounded-2xl border border-white/10 hover:border-cyan-500/30 transition-all">
            <Award className="w-5 h-5 text-amber-400 mb-2" />
            <h3 className="text-sm font-bold text-white">Grade Simulator</h3>
            <p className="text-xs text-slate-400 mt-0.5">Calculate exact test score needed for target %</p>
          </div>

          <div className="glass-panel p-4 rounded-2xl border border-white/10 hover:border-cyan-500/30 transition-all">
            <Flame className="w-5 h-5 text-rose-400 mb-2" />
            <h3 className="text-sm font-bold text-white">Pomodoro Focus</h3>
            <p className="text-xs text-slate-400 mt-0.5">Subject-linked timer with synthesized chime</p>
          </div>

          <div className="glass-panel p-4 rounded-2xl border border-white/10 hover:border-cyan-500/30 transition-all">
            <Bot className="w-5 h-5 text-indigo-400 mb-2" />
            <h3 className="text-sm font-bold text-white">Telegram & Gemini</h3>
            <p className="text-xs text-slate-400 mt-0.5">Text your bot; AI parses and logs instantly</p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-6xl w-full mx-auto flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 pt-8 border-t border-white/[0.06] z-10 gap-3">
        <p>© 2025/2026 Thanaweya Dashboard. Built for Egyptian high school excellence.</p>
        <div className="flex items-center gap-4">
          <span>Supabase RLS Protected</span>
          <span>•</span>
          <span>Native Vercel Deployment</span>
        </div>
      </footer>
    </div>
  );
}
