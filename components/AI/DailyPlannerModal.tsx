'use client';

import React, { useState } from 'react';
import { GlassModal } from '@/components/ui/GlassModal';
import { DailyPlanResponse, DailyPlanBlock } from '@/lib/types';
import {
  Sparkles,
  Clock,
  Coffee,
  BookOpen,
  CheckCircle2,
  RefreshCw,
  Calendar,
  Zap,
  Check,
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface DailyPlannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  plan: DailyPlanResponse | null;
  isLoading: boolean;
  onRegenerate: () => void;
  onApplyPlan?: (plan: DailyPlanResponse) => void;
}

export default function DailyPlannerModal({
  isOpen,
  onClose,
  plan,
  isLoading,
  onRegenerate,
  onApplyPlan,
}: DailyPlannerModalProps) {
  const [applied, setApplied] = useState(false);

  const handleApply = () => {
    if (!plan) return;
    setApplied(true);
    confetti({
      particleCount: 70,
      spread: 60,
      origin: { y: 0.7 },
      colors: ['#ffffff', '#38bdf8', '#818cf8', '#34d399'],
    });

    if (onApplyPlan) onApplyPlan(plan);

    setTimeout(() => {
      setApplied(false);
      onClose();
    }, 1200);
  };

  return (
    <GlassModal
      isOpen={isOpen}
      onClose={onClose}
      title="✨ خطة مذاكرة اليوم الذكية (Smart Daily Plan)"
    >
      <div className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
        {isLoading ? (
          <div className="py-14 text-center space-y-3">
            <RefreshCw className="w-8 h-8 mx-auto text-blue-400 animate-spin" />
            <p className="text-xs font-bold text-white">جاري تحليل حصصك، واجباتك، وامتحاناتك وتنسيق أفضل خطة ليومك...</p>
            <p className="text-[11px] text-neutral-400">نراعي وقت الدروس، الفواصل، وعدم إجهادك بمهام متتالية.</p>
          </div>
        ) : !plan ? (
          <div className="py-12 text-center text-neutral-500 space-y-2 text-xs">
            <Calendar className="w-8 h-8 mx-auto text-neutral-600" />
            <p className="text-white font-bold">لا توجد خطة مولدة حتى الآن</p>
            <button
              onClick={onRegenerate}
              className="mt-2 px-4 py-2 rounded-xl glass-button-primary text-xs font-bold"
            >
              توليد خطة اليوم
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Summary Banner */}
            <div className="p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-200 text-xs flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-blue-400 shrink-0" />
                <span className="font-semibold">{plan.summary}</span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-blue-500/20 text-blue-100">
                {plan.blocks.filter((b) => !b.isBreak).length} جلسات مذاكرة
              </span>
            </div>

            {/* Timeline Blocks */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-neutral-300">الجدول الزمني المقترح لليوم:</h3>

              {plan.blocks.map((block) => (
                <div
                  key={block.id}
                  className={`p-3 rounded-xl border transition-all ${
                    block.isBreak
                      ? 'bg-[#111612] border-emerald-500/20 text-emerald-300'
                      : block.type === 'lesson'
                      ? 'bg-[#12151e] border-blue-500/20 text-blue-200'
                      : 'bg-[#121212] border-white/10 text-white'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center shrink-0">
                        {block.isBreak ? (
                          <Coffee className="w-3.5 h-3.5 text-emerald-400" />
                        ) : block.type === 'lesson' ? (
                          <BookOpen className="w-3.5 h-3.5 text-blue-400" />
                        ) : (
                          <Zap className="w-3.5 h-3.5 text-amber-400" />
                        )}
                      </div>

                      <div>
                        <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                          <span>{block.title}</span>
                          {block.subject && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-white/10 text-neutral-300 font-normal">
                              {block.subject}
                            </span>
                          )}
                        </h4>
                        {block.notes && (
                          <p className="text-[11px] text-neutral-400 mt-0.5">{block.notes}</p>
                        )}
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-xs font-mono font-bold text-neutral-200 block">
                        {block.startTime} - {block.endTime}
                      </span>
                      <span className="text-[10px] text-neutral-500 font-mono">
                        {block.durationMinutes} دقيقة
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Recommendations */}
            {plan.recommendations && plan.recommendations.length > 0 && (
              <div className="p-3 rounded-xl bg-[#111111] border border-white/10 text-xs space-y-1">
                <span className="text-neutral-400 font-bold block mb-1">💡 نصائح للمذاكرة الفعالة:</span>
                <ul className="list-disc list-inside space-y-0.5 text-[11px] text-neutral-300 pl-1">
                  {plan.recommendations.map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={onRegenerate}
                className="px-3.5 py-2 rounded-xl glass-button-secondary text-xs flex items-center gap-1.5 cursor-pointer text-neutral-300 hover:text-white"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>إعادة تنظيم</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3 py-2 rounded-xl glass-button-secondary text-xs"
                >
                  إغلاق
                </button>
                <button
                  type="button"
                  onClick={handleApply}
                  className="px-5 py-2.5 rounded-xl glass-button-primary text-xs font-bold flex items-center gap-2 cursor-pointer shadow-lg shadow-blue-500/20"
                >
                  {applied ? (
                    <>
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                      <span>تم الاعتماد!</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                      <span>اعتماد خطة اليوم</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </GlassModal>
  );
}
