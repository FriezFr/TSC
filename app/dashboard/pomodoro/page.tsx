'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '@/lib/context';
import { GlassCard } from '@/components/ui/GlassCard';
import { playChime } from '@/lib/audio';
import { Flame, Play, Pause, RotateCcw, Volume2, Sparkles, CheckCircle2, History } from 'lucide-react';
import { THANAWEYA_SUBJECTS } from '@/lib/types';
import confetti from 'canvas-confetti';

export default function PomodoroPage() {
  const { sessions, logSession } = useApp();

  const [mode, setMode] = useState<'focus' | 'break'>('focus');
  const [focusMinutes, setFocusMinutes] = useState(25);
  const [breakMinutes, setBreakMinutes] = useState(5);
  const [subject, setSubject] = useState('Physics');

  const [timeLeft, setTimeLeft] = useState(focusMinutes * 60);
  const [isRunning, setIsRunning] = useState(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Sync timeLeft when duration changes and timer not running
  useEffect(() => {
    if (!isRunning) {
      setTimeLeft((mode === 'focus' ? focusMinutes : breakMinutes) * 60);
    }
  }, [focusMinutes, breakMinutes, mode, isRunning]);

  // Tick timer
  useEffect(() => {
    if (isRunning) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            handleTimerComplete();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRunning, mode, focusMinutes, breakMinutes, subject]);

  const handleTimerComplete = async () => {
    setIsRunning(false);

    if (mode === 'focus') {
      playChime('finish');
      confetti({
        particleCount: 50,
        spread: 80,
        origin: { y: 0.6 },
      });
      await logSession(subject, focusMinutes);
      // Switch to break
      setMode('break');
      setTimeLeft(breakMinutes * 60);
    } else {
      playChime('break');
      setMode('focus');
      setTimeLeft(focusMinutes * 60);
    }
  };

  const handleTogglePlay = () => {
    playChime('click');
    setIsRunning(!isRunning);
  };

  const handleReset = () => {
    playChime('click');
    setIsRunning(false);
    setTimeLeft((mode === 'focus' ? focusMinutes : breakMinutes) * 60);
  };

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  const totalDuration = (mode === 'focus' ? focusMinutes : breakMinutes) * 60;
  const progressPercent = ((totalDuration - timeLeft) / totalDuration) * 100;

  // Weekly Stats calculation
  const totalCompletedMinutes = sessions.reduce((acc, s) => acc + s.duration_minutes, 0);
  const totalCompletedHours = (totalCompletedMinutes / 60).toFixed(1);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.15)]">
              <Flame className="w-5 h-5" />
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight">
              Pomodoro Focus Timer
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Deep work cycles tied to your Thanaweya subjects with harmonic chimes.
          </p>
        </div>

        {/* Mode Switcher Pills */}
        <div className="flex items-center p-1 rounded-2xl bg-white/[0.04] border border-white/10 self-start sm:self-auto">
          <button
            onClick={() => {
              setMode('focus');
              setIsRunning(false);
              setTimeLeft(focusMinutes * 60);
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              mode === 'focus'
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-[0_0_15px_rgba(244,63,94,0.2)]'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Focus ({focusMinutes}m)
          </button>
          <button
            onClick={() => {
              setMode('break');
              setIsRunning(false);
              setTimeLeft(breakMinutes * 60);
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              mode === 'break'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-[0_0_15px_rgba(52,211,153,0.2)]'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Break ({breakMinutes}m)
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Timer Display (2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          <GlassCard glow className="p-8 sm:p-12 text-center relative overflow-hidden flex flex-col items-center justify-center min-h-[420px]">
            {/* Subject Selector at Top */}
            <div className="mb-6 flex items-center gap-3">
              <span className="text-xs font-medium text-slate-400">Current Subject:</span>
              <select
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                disabled={isRunning}
                className="glass-input px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-slate-900 text-cyan-300 border-cyan-500/30"
              >
                {THANAWEYA_SUBJECTS.map((s) => (
                  <option key={s.id} value={s.name.split(' ')[0]}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Circular Timer Ring */}
            <div className="relative w-64 h-64 sm:w-72 sm:h-72 flex items-center justify-center">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                {/* Background Ring */}
                <circle
                  cx="50"
                  cy="50"
                  r="44"
                  fill="transparent"
                  stroke="rgba(255, 255, 255, 0.05)"
                  strokeWidth="5"
                />
                {/* Active Glowing Ring */}
                <circle
                  cx="50"
                  cy="50"
                  r="44"
                  fill="transparent"
                  stroke={mode === 'focus' ? '#f43f5e' : '#34d399'}
                  strokeWidth="5"
                  strokeDasharray="276.46"
                  strokeDashoffset={276.46 - (276.46 * progressPercent) / 100}
                  strokeLinecap="round"
                  className="transition-all duration-500 ease-linear"
                  style={{
                    filter:
                      mode === 'focus'
                        ? 'drop-shadow(0 0 10px rgba(244, 63, 94, 0.6))'
                        : 'drop-shadow(0 0 10px rgba(52, 211, 153, 0.6))',
                  }}
                />
              </svg>

              {/* Time Numbers in Center */}
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-5xl sm:text-6xl font-black tracking-tight text-white font-mono drop-shadow-[0_4px_20px_rgba(0,0,0,0.8)]">
                  {formattedTime}
                </span>
                <span className="text-xs font-semibold uppercase tracking-widest text-slate-400 mt-2">
                  {mode === 'focus' ? `Focusing on ${subject}` : 'Rest & Refresh'}
                </span>
              </div>
            </div>

            {/* Control Buttons */}
            <div className="flex items-center gap-4 mt-8">
              <button
                onClick={handleTogglePlay}
                className={`px-8 py-3.5 rounded-2xl font-black text-sm flex items-center gap-2 shadow-2xl transition-all ${
                  isRunning
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30'
                    : mode === 'focus'
                    ? 'bg-gradient-to-r from-rose-500 to-pink-600 text-white shadow-[0_0_30px_rgba(244,63,94,0.4)] hover:brightness-110'
                    : 'bg-gradient-to-r from-emerald-500 to-teal-600 text-slate-950 shadow-[0_0_30px_rgba(52,211,153,0.4)]'
                }`}
              >
                {isRunning ? (
                  <>
                    <Pause className="w-4 h-4 fill-current" />
                    <span>Pause</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-current ml-0.5" />
                    <span>Start Session</span>
                  </>
                )}
              </button>

              <button
                onClick={handleReset}
                className="p-3.5 rounded-2xl glass-button-secondary text-slate-300 hover:text-white transition-all"
                title="Reset Timer"
              >
                <RotateCcw className="w-4 h-4" />
              </button>

              <button
                onClick={() => playChime('finish')}
                className="p-3.5 rounded-2xl glass-button-secondary text-slate-400 hover:text-cyan-300 transition-all"
                title="Test Chime Sound"
              >
                <Volume2 className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Presets */}
            <div className="flex items-center gap-2 mt-6 text-xs text-slate-400">
              <span>Presets:</span>
              <button
                onClick={() => {
                  setFocusMinutes(25);
                  setBreakMinutes(5);
                }}
                className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 border border-white/5"
              >
                25 / 5m
              </button>
              <button
                onClick={() => {
                  setFocusMinutes(50);
                  setBreakMinutes(10);
                }}
                className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 border border-white/5"
              >
                50 / 10m
              </button>
              <button
                onClick={() => {
                  setFocusMinutes(90);
                  setBreakMinutes(15);
                }}
                className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 border border-white/5"
              >
                90 / 15m (Deep Exam Mock)
              </button>
            </div>
          </GlassCard>
        </div>

        {/* History & Statistics (1 col) */}
        <div className="space-y-4">
          <GlassCard className="p-6 space-y-4">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-cyan-400" />
              <h2 className="text-sm font-bold text-white">Focus Summary</h2>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/5 text-center">
                <span className="block text-2xl font-black text-cyan-400 font-mono">
                  {totalCompletedHours}h
                </span>
                <span className="block text-[11px] text-slate-400 mt-0.5">Total Focus Time</span>
              </div>

              <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/5 text-center">
                <span className="block text-2xl font-black text-rose-400 font-mono">
                  {sessions.length}
                </span>
                <span className="block text-[11px] text-slate-400 mt-0.5">Completed Cycles</span>
              </div>
            </div>

            <div className="pt-3 border-t border-white/10 space-y-2">
              <h4 className="text-xs font-bold text-slate-400">Recent Completed Sessions</h4>
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {sessions.length === 0 ? (
                  <p className="text-xs text-slate-500 py-4 text-center">
                    No sessions logged yet. Complete your first 25m cycle!
                  </p>
                ) : (
                  sessions.slice(0, 8).map((s, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.02] border border-white/5"
                    >
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-xs font-semibold text-slate-200">
                          {s.subject}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono">
                        <span className="text-cyan-300 font-bold">{s.duration_minutes}m</span>
                        <span>•</span>
                        <span>{s.completed_at}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
