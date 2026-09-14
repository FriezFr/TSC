'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '@/lib/context';
import { GlassCard } from '@/components/ui/GlassCard';
import { Sparkles, Play, RotateCw, Brain, AlertCircle, Clock, CheckCircle2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { StudyRecommendation } from '@/lib/types';

interface WhatShouldIStudyCardProps {
  onOpenStudyMemory?: () => void;
  onOpenMistakeBank?: () => void;
}

export default function WhatShouldIStudyCard({
  onOpenStudyMemory,
  onOpenMistakeBank,
}: WhatShouldIStudyCardProps) {
  const { getWhatToStudyRecommendation, language, academicMemories, mistakes } = useApp();
  const router = useRouter();

  const [recommendation, setRecommendation] = useState<StudyRecommendation | null>(null);
  const [showAlternative, setShowAlternative] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    try {
      const rec = getWhatToStudyRecommendation();
      setRecommendation(rec);
    } catch (err) {
      console.error('Error generating recommendation:', err);
    }
  }, [language]);

  const activeRec = showAlternative && recommendation?.alternative
    ? {
        subject: recommendation.alternative.subject,
        topic: recommendation.alternative.topic,
        durationMinutes: recommendation.alternative.durationMinutes,
        reason: recommendation.alternative.reason,
        urgency: 'normal' as const,
        actionType: 'regular_study' as const,
      }
    : recommendation;

  const handleRefresh = () => {
    setIsRefreshing(true);
    try {
      const rec = getWhatToStudyRecommendation();
      setRecommendation(rec);
      setShowAlternative(false);
    } finally {
      setTimeout(() => setIsRefreshing(false), 300);
    }
  };

  const handleStartSession = () => {
    if (!activeRec) return;
    const params = new URLSearchParams();
    params.set('subject', activeRec.subject);
    params.set('duration', String(activeRec.durationMinutes || 45));
    if (activeRec.topic) params.set('topic', activeRec.topic);
    params.set('autoStart', 'true');
    router.push(`/dashboard/pomodoro?${params.toString()}`);
  };

  if (!activeRec) return null;

  const isAr = language === 'ar';
  const unmasteredMistakesCount = mistakes.filter((m) => !m.is_mastered).length;
  const weakTopicsCount = academicMemories.filter((m) => m.confidence_level === 'low').length;

  const getUrgencyBadge = (urgency: string) => {
    if (urgency === 'high') {
      return (
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/15 text-red-300 border border-red-500/30 font-semibold flex items-center gap-1">
          <AlertCircle className="w-3 h-3 text-red-400" />
          <span>{isAr ? 'أولوية قصوى' : 'High Urgency'}</span>
        </span>
      );
    }
    if (urgency === 'medium') {
      return (
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 font-semibold flex items-center gap-1">
          <Clock className="w-3 h-3 text-amber-400" />
          <span>{isAr ? 'أولوية متوسطة' : 'Recommended'}</span>
        </span>
      );
    }
    return (
      <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-300 border border-blue-500/30 font-semibold flex items-center gap-1">
        <Sparkles className="w-3 h-3 text-blue-400" />
        <span>{isAr ? 'استثمار وقت' : 'Best Next Action'}</span>
      </span>
    );
  };

  return (
    <div className="relative group">
      {/* Subtle outer glowing gradient */}
      <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-600 via-indigo-500 to-purple-600 rounded-3xl blur opacity-30 group-hover:opacity-50 transition duration-500" />

      <GlassCard className="relative p-5 sm:p-6 overflow-hidden bg-[#0d0d0d]/90 border border-white/10 space-y-4">
        {/* Top bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/5 pb-3.5">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-blue-500/15 border border-blue-500/25 flex items-center justify-center text-blue-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-white tracking-tight">
                  {isAr ? 'ماذا أذاكر الآن؟ (AI Decision)' : 'What should I study right now?'}
                </h2>
                {getUrgencyBadge(activeRec.urgency)}
              </div>
              <p className="text-[11px] text-neutral-400">
                {isAr
                  ? 'محرك القرار الذكي يحلل جدولك، امتحاناتك، وواجباتك المعلقة لتحديد خطوتك القادمة'
                  : 'AI analyzes your active exams, deadlines, and weak topics to give you one clear action'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onOpenStudyMemory && (
              <button
                onClick={onOpenStudyMemory}
                className="px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-neutral-300 hover:text-white text-[11px] font-medium flex items-center gap-1.5 transition-all cursor-pointer border border-white/5"
                title={isAr ? 'فتح ذاكرة التعلم' : 'Open Study Memory'}
              >
                <Brain className="w-3.5 h-3.5 text-indigo-400" />
                <span>{isAr ? 'الذاكرة' : 'Memory'}</span>
                {weakTopicsCount > 0 && (
                  <span className="w-4 h-4 rounded-full bg-indigo-500/30 text-indigo-300 text-[10px] flex items-center justify-center font-bold">
                    {weakTopicsCount}
                  </span>
                )}
              </button>
            )}

            {onOpenMistakeBank && (
              <button
                onClick={onOpenMistakeBank}
                className="px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-neutral-300 hover:text-white text-[11px] font-medium flex items-center gap-1.5 transition-all cursor-pointer border border-white/5"
                title={isAr ? 'فتح بنك الأخطاء' : 'Open Mistake Bank'}
              >
                <AlertCircle className="w-3.5 h-3.5 text-red-400" />
                <span>{isAr ? 'الأخطاء' : 'Mistakes'}</span>
                {unmasteredMistakesCount > 0 && (
                  <span className="w-4 h-4 rounded-full bg-red-500/30 text-red-300 text-[10px] flex items-center justify-center font-bold">
                    {unmasteredMistakesCount}
                  </span>
                )}
              </button>
            )}

            <button
              onClick={handleRefresh}
              className={`p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white transition-all cursor-pointer border border-white/5 ${
                isRefreshing ? 'animate-spin' : ''
              }`}
              title={isAr ? 'إعادة الحساب' : 'Recalculate'}
            >
              <RotateCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Content Box */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-white/[0.04] to-transparent border border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5 max-w-xl">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-md bg-blue-500/20 text-blue-300 border border-blue-500/30">
                {activeRec.subject}
              </span>
              {activeRec.topic && (
                <span className="text-sm font-semibold text-white">
                  • {activeRec.topic}
                </span>
              )}
              <span className="text-xs text-neutral-400 flex items-center gap-1">
                <Clock className="w-3 h-3 text-neutral-500" />
                <span>{activeRec.durationMinutes} {isAr ? 'دقيقة' : 'min'}</span>
              </span>
            </div>

            <p className="text-xs text-neutral-300 leading-relaxed">
              💡 {activeRec.reason}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 shrink-0">
            {recommendation?.alternative && (
              <button
                onClick={() => setShowAlternative(!showAlternative)}
                className="px-3 py-2.5 rounded-xl glass-button-secondary text-xs font-semibold text-neutral-300 hover:text-white flex items-center gap-1.5 cursor-pointer transition-all"
              >
                <span>{showAlternative ? (isAr ? 'الاقتراح الأساسي' : 'Primary Suggestion') : (isAr ? 'بديل آخر' : 'Alternative')}</span>
              </button>
            )}

            <button
              onClick={handleStartSession}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold flex items-center gap-2 cursor-pointer shadow-lg shadow-blue-500/25 transition-all transform active:scale-95"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>{isAr ? `ابدأ الجلسة (${activeRec.durationMinutes} د)` : `Start Session (${activeRec.durationMinutes}m)`}</span>
            </button>
          </div>
        </div>
      </GlassCard>
    </div>
  );
}
