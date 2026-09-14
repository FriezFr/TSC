'use client';

import React, { useState } from 'react';
import { useApp } from '@/lib/context';
import { GlassModal } from '@/components/ui/GlassModal';
import { GlassCard } from '@/components/ui/GlassCard';
import { Brain, Plus, Trash2, CheckCircle2, AlertTriangle, Sparkles, Filter, X } from 'lucide-react';
import { THANAWEYA_SUBJECTS } from '@/lib/types';

interface StudyMemoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function StudyMemoryModal({ isOpen, onClose }: StudyMemoryModalProps) {
  const { academicMemories, addAcademicMemory, updateAcademicMemory, deleteAcademicMemory, language } = useApp();
  const isAr = language === 'ar';

  const [isAdding, setIsAdding] = useState(false);
  const [filterSubject, setFilterSubject] = useState<string>('all');

  // Form State
  const [subject, setSubject] = useState('Physics');
  const [topic, setTopic] = useState('');
  const [confidence, setConfidence] = useState<'low' | 'medium' | 'high'>('low');
  const [errorsInput, setErrorsInput] = useState('');
  const [notes, setNotes] = useState('');

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim()) return;

    const commonErrors = errorsInput
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    await addAcademicMemory(subject, topic.trim(), confidence, commonErrors, notes.trim() || undefined);
    setTopic('');
    setErrorsInput('');
    setNotes('');
    setIsAdding(false);
  };

  const handleToggleMastered = async (id: string, currentConfidence: string) => {
    const nextConfidence = currentConfidence === 'high' ? 'low' : 'high';
    await updateAcademicMemory(id, { confidence_level: nextConfidence });
  };

  const filteredMemories = academicMemories.filter((m) => {
    if (filterSubject !== 'all' && m.subject !== filterSubject) return false;
    return true;
  });

  const getConfidenceBadge = (level: string) => {
    if (level === 'low') {
      return (
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/15 text-red-300 border border-red-500/30 font-semibold flex items-center gap-1">
          <AlertTriangle className="w-3 h-3 text-red-400" />
          <span>{isAr ? 'نقطة ضعف (أولوية)' : 'Weak / Low Confidence'}</span>
        </span>
      );
    }
    if (level === 'medium') {
      return (
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 font-semibold">
          {isAr ? 'متوسط الإتقان' : 'Moderate'}
        </span>
      );
    }
    return (
      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-semibold flex items-center gap-1">
        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
        <span>{isAr ? 'مُتقن بالكامل ✓' : 'Mastered ✓'}</span>
      </span>
    );
  };

  return (
    <GlassModal isOpen={isOpen} onClose={onClose} title={isAr ? 'ذاكرة التعلم الذكية (Study Memory)' : 'AI Study Memory 🧠'} maxWidth="max-w-2xl">
      <div className="space-y-4">
        <p className="text-xs text-neutral-400 leading-relaxed">
          {isAr
            ? 'يسجل الذكاء الاصطناعي نقاط ضعفك والأخطاء الشائعة التي تكررها، ويقوم تلقائياً بتوجيه خطط المذاكرة والاختبارات التدريبية لتقويتها.'
            : 'TSC remembers your academic weak spots and common error patterns, automatically prioritizing them in your daily plans.'}
        </p>

        {/* Action bar & filter */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/5 pb-3">
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-neutral-400" />
            <select
              value={filterSubject}
              onChange={(e) => setFilterSubject(e.target.value)}
              className="glass-input px-3 py-1 rounded-lg text-xs bg-[#0d0d0d] text-neutral-200"
            >
              <option value="all">{isAr ? 'كل المواد' : 'All Subjects'}</option>
              {THANAWEYA_SUBJECTS.map((s) => (
                <option key={s.id} value={s.name.split(' ')[0]}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => setIsAdding(!isAdding)}
            className="px-3 py-1.5 rounded-xl glass-button-primary text-xs font-bold flex items-center gap-1.5 cursor-pointer"
          >
            {isAdding ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
            <span>{isAdding ? (isAr ? 'إلغاء' : 'Cancel') : (isAr ? 'تسجيل نقطة ضعف جديدة' : 'Add Weak Topic')}</span>
          </button>
        </div>

        {/* Add Memory Form */}
        {isAdding && (
          <form onSubmit={handleAdd} className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3">
            <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-blue-400" />
              <span>{isAr ? 'تسجيل موضوع يحتاج تركيز وتقوية' : 'Log Topic Requiring Reinforcement'}</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] text-neutral-400 block mb-1">{isAr ? 'المادة' : 'Subject'}</label>
                <select
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full glass-input px-3 py-2 rounded-xl text-xs bg-[#0d0d0d] text-neutral-200"
                >
                  {THANAWEYA_SUBJECTS.map((s) => (
                    <option key={s.id} value={s.name.split(' ')[0]}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] text-neutral-400 block mb-1">{isAr ? 'الموضوع / الدرس' : 'Topic / Concept'}</label>
                <input
                  type="text"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder={isAr ? 'مثال: Quadratic Equations أو قوانين نيوتن' : 'e.g. Quadratic Equations, Vectors'}
                  required
                  className="w-full glass-input px-3 py-2 rounded-xl text-xs bg-[#0d0d0d] text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] text-neutral-400 block mb-1">{isAr ? 'مستوى الثقة' : 'Confidence Level'}</label>
                <select
                  value={confidence}
                  onChange={(e) => setConfidence(e.target.value as any)}
                  className="w-full glass-input px-3 py-2 rounded-xl text-xs bg-[#0d0d0d] text-neutral-200"
                >
                  <option value="low">{isAr ? 'ضعيف / مرتبك (أولوية قصوى)' : 'Low / Confused (High Priority)'}</option>
                  <option value="medium">{isAr ? 'متوسط / يحتاج حل إضافي' : 'Medium / Needs Practice'}</option>
                  <option value="high">{isAr ? 'مُتقن / مراجعة دورية' : 'High / Mastered'}</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] text-neutral-400 block mb-1">{isAr ? 'الأخطاء الشائعة (مفصولة بفواصل)' : 'Common Errors (comma separated)'}</label>
                <input
                  type="text"
                  value={errorsInput}
                  onChange={(e) => setErrorsInput(e.target.value)}
                  placeholder={isAr ? 'مثال: إشارات السالب، التحليل، تطبيق القانون' : 'e.g. Sign errors, factoring formula'}
                  className="w-full glass-input px-3 py-2 rounded-xl text-xs bg-[#0d0d0d] text-white"
                />
              </div>
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="submit"
                className="px-4 py-2 rounded-xl glass-button-primary text-xs font-bold cursor-pointer"
              >
                {isAr ? 'حفظ في الذاكرة' : 'Save to Memory'}
              </button>
            </div>
          </form>
        )}

        {/* List of Academic Memories */}
        <div className="space-y-2.5 max-h-[50vh] overflow-y-auto pr-1">
          {filteredMemories.length === 0 ? (
            <div className="py-10 text-center text-neutral-500 space-y-2">
              <Brain className="w-8 h-8 text-neutral-600 mx-auto" />
              <p className="text-xs font-semibold text-neutral-400">
                {isAr ? 'لا توجد موضوعات مسجلة حالياً' : 'No study memory topics logged yet'}
              </p>
              <p className="text-[11px] text-neutral-500 max-w-sm mx-auto">
                {isAr
                  ? 'عندما تذكر للذكاء الاصطناعي في واتساب أو تيليجرام موضوعاً يصعب عليك (مثل "مش عارف احل كذا") سيتم تدوينه وتحديثه هنا تلقائياً.'
                  : 'Mention difficult topics to TaskerBot in chat or add them manually to train your AI.'}
              </p>
            </div>
          ) : (
            filteredMemories.map((m) => (
              <div
                key={m.id}
                className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/5 hover:border-white/10 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-blue-500/10 text-blue-300 border border-blue-500/20">
                      {m.subject}
                    </span>
                    <span className="text-xs font-bold text-white">
                      {m.topic}
                    </span>
                    {getConfidenceBadge(m.confidence_level)}
                  </div>

                  {m.common_errors && m.common_errors.length > 0 && (
                    <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                      <span className="text-[10px] text-neutral-500 font-mono">{isAr ? 'ملاحظة:' : 'Errors:'}</span>
                      {m.common_errors.map((err, i) => (
                        <span
                          key={i}
                          className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-neutral-300 border border-white/5"
                        >
                          {err}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                  <button
                    onClick={() => handleToggleMastered(m.id, m.confidence_level)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold flex items-center gap-1 cursor-pointer transition-all ${
                      m.confidence_level === 'high'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : 'bg-white/5 text-neutral-400 hover:text-white border border-white/10'
                    }`}
                    title={isAr ? 'تحديد كـ متقن' : 'Toggle mastered'}
                  >
                    <CheckCircle2 className="w-3 h-3" />
                    <span>{m.confidence_level === 'high' ? (isAr ? 'مُتقن' : 'Mastered') : (isAr ? 'أتقنته' : 'Mark Mastered')}</span>
                  </button>

                  <button
                    onClick={() => deleteAcademicMemory(m.id)}
                    className="p-1 rounded-lg text-neutral-500 hover:text-red-400 transition-colors cursor-pointer"
                    title={isAr ? 'حذف' : 'Delete'}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </GlassModal>
  );
}
