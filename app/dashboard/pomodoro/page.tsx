'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '@/lib/context';
import { GlassCard } from '@/components/ui/GlassCard';
import { playChime } from '@/lib/audio';
import { Flame, Play, Pause, RotateCcw, Volume2, CheckCircle2, History, Sparkles } from 'lucide-react';
import { THANAWEYA_SUBJECTS } from '@/lib/types';

export default function PomodoroPage() {
  const { sessions, logSession } = useApp();

  const [mode, setMode] = useState<'focus' | 'break'>('focus');
  const [focusMinutes, setFocusMinutes] = useState(25);
  const [breakMinutes, setBreakMinutes] = useState(5);
  const [subject, setSubject] = useState('Physics');
  const [topic, setTopic] = useState('');
  const [isAutoConfigured, setIsAutoConfigured] = useState(false);

  const [timeLeft, setTimeLeft] = useState(focusMinutes * 60);
  const [isRunning, setIsRunning] = useState(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const paramSubject = params.get('subject');
    const paramDuration = params.get('duration');
    const paramTopic = params.get('topic');
    const paramAutoStart = params.get('autoStart');

    if (paramSubject || paramDuration || paramTopic) {
      setIsAutoConfigured(true);
      if (paramSubject) setSubject(paramSubject);
      if (paramTopic) setTopic(paramTopic);
      if (paramDuration) {
        const d = parseInt(paramDuration, 10);
        if (!isNaN(d) && d > 0) {
          setFocusMinutes(d);
          setTimeLeft(d * 60);
        }
      }
      if (paramAutoStart === 'true') {
        setIsRunning(true);
      }
    }
  }, []);

  useEffect(() => {
    if (!isRunning && !isAutoConfigured) {
      setTimeLeft((mode === 'focus' ? focusMinutes : breakMinutes) * 60);
    }
  }, [focusMinutes, breakMinutes, mode, isRunning, isAutoConfigured]);

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
      await logSession(subject, focusMinutes);
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

  const totalCompletedMinutes = sessions.reduce((acc, s) => acc + s.duration_minutes, 0);
  const totalCompletedHours = (totalCompletedMinutes / 60).toFixed(1);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Pomodoro Focus
          </h1>
          <p className="text-xs text-neutral-400 mt-1">
            Focus cycles tied to your Baccalaureate subjects.
          </p>
        </div>

        {/* Mode Switcher */}
        <div className="flex items-center p-0.5 rounded-xl bg-[#111111] border border-white/10 self-start sm:self-auto">
          <button
            onClick={() => {
              setMode('focus');
              setIsRunning(false);
              setTimeLeft(focusMinutes * 60);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              mode === 'focus' ? 'bg-white text-black font-bold' : 'text-neutral-400 hover:text-white'
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
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              mode === 'break' ? 'bg-white text-black font-bold' : 'text-neutral-400 hover:text-white'
            }`}
          >
            Break ({breakMinutes}m)
          </button>
        </div>
      </div>

      {isAutoConfigured && (
        <div className="p-3.5 rounded-xl bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-purple-500/10 border border-blue-500/30 flex items-center justify-between gap-2 text-xs text-blue-200 animate-in fade-in">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-blue-400 shrink-0" />
            <span>
              Targeted Session: <strong className="text-white">{subject}</strong>
              {topic ? ` — ${topic}` : ''} ({focusMinutes} min)
            </span>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 font-mono shrink-0">
            AI Directed
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Timer Display */}
        <div className="lg:col-span-2">
          <GlassCard className="p-8 sm:p-12 text-center flex flex-col items-center justify-center min-h-[400px]">
            <div className="mb-6 flex items-center gap-3">
              <span className="text-xs text-neutral-400">Subject:</span>
              <select
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                disabled={isRunning}
                className="glass-input px-3 py-1.5 rounded-xl text-xs bg-[#0d0d0d] text-white"
              >
                {THANAWEYA_SUBJECTS.map((s) => (
                  <option key={s.id} value={s.name.split(' ')[0]}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Circular Timer Ring */}
            <div className="relative w-60 h-60 sm:w-64 sm:h-64 flex items-center justify-center">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="44"
                  fill="transparent"
                  stroke="#171717"
                  strokeWidth="4"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="44"
                  fill="transparent"
                  stroke="#ffffff"
                  strokeWidth="4"
                  strokeDasharray="276.46"
                  strokeDashoffset={276.46 - (276.46 * progressPercent) / 100}
                  strokeLinecap="round"
                  className="transition-all duration-500 ease-linear"
                />
              </svg>

              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-5xl sm:text-6xl font-black text-white font-mono">
                  {formattedTime}
                </span>
                <span className="text-xs uppercase tracking-widest text-neutral-500 mt-2 font-medium">
                  {mode === 'focus' ? subject : 'Rest'}
                </span>
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-3 mt-8">
              <button
                onClick={handleTogglePlay}
                className="px-8 py-3 rounded-xl glass-button-primary text-sm font-bold flex items-center gap-2 cursor-pointer"
              >
                {isRunning ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
                <span>{isRunning ? 'Pause' : 'Start'}</span>
              </button>

              <button
                onClick={handleReset}
                className="p-3 rounded-xl glass-button-secondary text-neutral-400 hover:text-white cursor-pointer"
                title="Reset"
              >
                <RotateCcw className="w-4 h-4" />
              </button>

              <button
                onClick={() => playChime('finish')}
                className="p-3 rounded-xl glass-button-secondary text-neutral-400 hover:text-white cursor-pointer"
                title="Test Chime"
              >
                <Volume2 className="w-4 h-4" />
              </button>
            </div>
          </GlassCard>
        </div>

        {/* Focus Stats */}
        <div className="space-y-4">
          <GlassCard className="p-5 space-y-4">
            <h2 className="text-sm font-bold text-white">Focus History</h2>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-[#111111] text-center">
                <span className="block text-2xl font-black text-white font-mono">
                  {totalCompletedHours}h
                </span>
                <span className="block text-[11px] text-neutral-500">Total Hours</span>
              </div>

              <div className="p-3 rounded-xl bg-[#111111] text-center">
                <span className="block text-2xl font-black text-white font-mono">
                  {sessions.length}
                </span>
                <span className="block text-[11px] text-neutral-500">Cycles Done</span>
              </div>
            </div>

            <div className="space-y-1.5 pt-2 border-t border-white/10 max-h-64 overflow-y-auto">
              {sessions.length === 0 ? (
                <p className="text-xs text-neutral-500 text-center py-4">
                  No sessions recorded yet. Complete a 25m cycle to start logging.
                </p>
              ) : (
                sessions.slice(0, 10).map((s, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2 rounded-lg bg-[#111111] text-xs"
                  >
                    <span className="text-neutral-200">{s.subject}</span>
                    <span className="text-neutral-500 font-mono">
                      {s.duration_minutes}m • {s.completed_at}
                    </span>
                  </div>
                ))
              )}
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
