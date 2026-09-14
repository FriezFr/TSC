'use client';

import React, { useState } from 'react';
import { useApp } from '@/lib/context';
import { GlassModal } from '@/components/ui/GlassModal';
import { GlassCard } from '@/components/ui/GlassCard';
import {
  BookX,
  Plus,
  Trash2,
  CheckCircle2,
  RotateCcw,
  Target,
  Sparkles,
  Filter,
  X,
  Eye,
  ArrowRight,
  ArrowLeft,
  Flame,
  Award,
} from 'lucide-react';
import { THANAWEYA_SUBJECTS, MistakeItem } from '@/lib/types';

interface MistakeBankModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialPracticeMode?: boolean;
}

export default function MistakeBankModal({
  isOpen,
  onClose,
  initialPracticeMode = false,
}: MistakeBankModalProps) {
  const { mistakes, addMistake, markMistakeMastered, deleteMistake, language } = useApp();
  const isAr = language === 'ar';

  const [isAdding, setIsAdding] = useState(false);
  const [filterSubject, setFilterSubject] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'unmastered' | 'mastered'>('all');

  // Practice Mode state
  const [isPracticing, setIsPracticing] = useState(initialPracticeMode);
  const [practiceIndex, setPracticeIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);

  // Form State
  const [subject, setSubject] = useState('Physics');
  const [topic, setTopic] = useState('');
  const [question, setQuestion] = useState('');
  const [studentAnswer, setStudentAnswer] = useState('');
  const [correctAnswer, setCorrectAnswer] = useState('');
  const [explanation, setExplanation] = useState('');
  const [mistakeType, setMistakeType] = useState<MistakeItem['mistake_type']>('concept_gap');

  const unmasteredMistakes = mistakes.filter((m) => !m.is_mastered);
  const masteredMistakes = mistakes.filter((m) => m.is_mastered);

  // Frequency aggregation by Topic & Subject
  const topicFrequency: Record<string, { count: number; subject: string }> = {};
  mistakes.forEach((m) => {
    const key = `${m.subject} — ${m.topic || (isAr ? 'مسائل عامة' : 'General')}`;
    if (!topicFrequency[key]) {
      topicFrequency[key] = { count: 0, subject: m.subject };
    }
    topicFrequency[key].count += m.times_repeated || 1;
  });

  const filteredMistakes = mistakes.filter((m) => {
    if (filterSubject !== 'all' && m.subject !== filterSubject) return false;
    if (filterStatus === 'unmastered' && m.is_mastered) return false;
    if (filterStatus === 'mastered' && !m.is_mastered) return false;
    return true;
  });

  const practiceItems = unmasteredMistakes.length > 0 ? unmasteredMistakes : mistakes;
  const currentPracticeItem = practiceItems[practiceIndex];

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim() || !correctAnswer.trim()) return;

    await addMistake(subject, question.trim(), correctAnswer.trim(), {
      topic: topic.trim() || undefined,
      studentAnswer: studentAnswer.trim() || undefined,
      explanation: explanation.trim() || undefined,
      mistakeType,
    });

    setTopic('');
    setQuestion('');
    setStudentAnswer('');
    setCorrectAnswer('');
    setExplanation('');
    setIsAdding(false);
  };

  const handleStartPractice = () => {
    setPracticeIndex(0);
    setShowAnswer(false);
    setIsPracticing(true);
  };

  const handleNextPractice = async (gotCorrect: boolean) => {
    if (currentPracticeItem && gotCorrect) {
      await markMistakeMastered(currentPracticeItem.id, true);
    }
    setShowAnswer(false);
    if (practiceIndex < practiceItems.length - 1) {
      setPracticeIndex((prev) => prev + 1);
    } else {
      setIsPracticing(false);
      setPracticeIndex(0);
    }
  };

  return (
    <GlassModal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <BookX className="w-5 h-5 text-rose-400" />
          <span>{isAr ? 'بنك الأخطاء الأكاديمي' : 'Mistake Bank & Error Log'}</span>
        </div>
      }
      maxWidth="max-w-4xl"
    >
      <div className="space-y-6">
        {/* Top Overview & Frequency Banner */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <GlassCard className="p-3.5 flex items-center gap-3 border-rose-500/20 bg-rose-500/5">
            <div className="w-10 h-10 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center shrink-0">
              <BookX className="w-5 h-5 text-rose-400" />
            </div>
            <div>
              <p className="text-xs text-white/50">{isAr ? 'إجمالي الأخطاء المسجلة' : 'Total Logged'}</p>
              <h4 className="text-xl font-bold text-rose-200">{mistakes.length}</h4>
            </div>
          </GlassCard>

          <GlassCard className="p-3.5 flex items-center gap-3 border-amber-500/20 bg-amber-500/5">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center shrink-0">
              <RotateCcw className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <p className="text-xs text-white/50">{isAr ? 'تحتاج تدريب ومراجعة' : 'Needs Practice'}</p>
              <h4 className="text-xl font-bold text-amber-200">{unmasteredMistakes.length}</h4>
            </div>
          </GlassCard>

          <GlassCard className="p-3.5 flex items-center gap-3 border-emerald-500/20 bg-emerald-500/5">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-xs text-white/50">{isAr ? 'تم إتقانها وتصحيحها' : 'Mastered'}</p>
              <h4 className="text-xl font-bold text-emerald-200">{masteredMistakes.length}</h4>
            </div>
          </GlassCard>
        </div>

        {/* Breakdown by Topic (Frequency tags) */}
        {Object.keys(topicFrequency).length > 0 && (
          <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10 space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-white/70 uppercase tracking-wider">
              <Flame className="w-3.5 h-3.5 text-rose-400" />
              <span>{isAr ? 'تكرار الأخطاء حسب الموضوع' : 'Mistake Frequency Breakdown'}</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {Object.entries(topicFrequency)
                .sort((a, b) => b[1].count - a[1].count)
                .map(([topicKey, data]) => (
                  <span
                    key={topicKey}
                    className={`text-xs px-2.5 py-1 rounded-lg border flex items-center gap-1.5 ${
                      data.count >= 3
                        ? 'bg-rose-500/15 border-rose-500/30 text-rose-200 font-semibold'
                        : 'bg-white/5 border-white/10 text-white/80'
                    }`}
                  >
                    <span>{topicKey}</span>
                    <span className="px-1.5 py-0.2 text-[11px] rounded bg-white/10 font-mono font-bold text-white">
                      ×{data.count}
                    </span>
                  </span>
                ))}
            </div>
          </div>
        )}

        {/* Practice Mode Overlay/Section */}
        {isPracticing && currentPracticeItem ? (
          <div className="relative p-6 rounded-2xl bg-gradient-to-b from-rose-950/40 to-slate-900/80 border border-rose-500/30 backdrop-blur-xl shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Target className="w-5 h-5 text-rose-400 animate-pulse" />
                <span className="text-sm font-semibold text-white/90">
                  {isAr ? 'جلسة تدريب على الأخطاء السابقة' : 'Mistake Practice Session'}
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 font-medium border border-rose-500/30">
                  {practiceIndex + 1} / {practiceItems.length}
                </span>
              </div>
              <button
                onClick={() => setIsPracticing(false)}
                className="text-xs text-white/50 hover:text-white flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
                <span>{isAr ? 'إنهاء التدريب' : 'Exit Practice'}</span>
              </button>
            </div>

            {/* Question Card */}
            <div className="p-4 rounded-xl bg-black/40 border border-white/10 space-y-3">
              <div className="flex items-center justify-between text-xs text-white/50">
                <span className="font-semibold text-rose-300">{currentPracticeItem.subject}</span>
                {currentPracticeItem.topic && <span>{currentPracticeItem.topic}</span>}
              </div>
              <p className="text-base font-medium text-white/90 whitespace-pre-wrap leading-relaxed">
                {currentPracticeItem.question}
              </p>
            </div>

            {/* Past Student Error Note (if present) */}
            {currentPracticeItem.student_answer && (
              <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 flex items-start gap-2">
                <span className="font-bold shrink-0">{isAr ? 'خطؤك السابق:' : 'Your Past Error:'}</span>
                <span className="italic">{currentPracticeItem.student_answer}</span>
              </div>
            )}

            {/* Reveal Answer Section */}
            {!showAnswer ? (
              <button
                onClick={() => setShowAnswer(true)}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white font-medium text-sm shadow-lg flex items-center justify-center gap-2 transition-all hover:scale-[1.01] active:scale-[0.99]"
              >
                <Eye className="w-4 h-4" />
                <span>{isAr ? 'عرض الإجابة والحل النموذجي' : 'Reveal Solution & Explanation'}</span>
              </button>
            ) : (
              <div className="space-y-4 animate-in fade-in duration-200">
                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 space-y-2">
                  <span className="text-xs font-bold text-emerald-400 uppercase tracking-wide">
                    {isAr ? 'الإجابة النموذجية' : 'Correct Answer'}
                  </span>
                  <p className="text-sm font-semibold text-emerald-200 whitespace-pre-wrap">
                    {currentPracticeItem.correct_answer}
                  </p>
                  {currentPracticeItem.explanation && (
                    <div className="pt-2 mt-2 border-t border-emerald-500/20 text-xs text-white/70 leading-relaxed">
                      <span className="font-bold text-emerald-300">{isAr ? 'الشرح / الملاحظة: ' : 'Why: '}</span>
                      {currentPracticeItem.explanation}
                    </div>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                  <button
                    onClick={() => handleNextPractice(false)}
                    className="flex-1 py-2.5 px-4 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/30 text-rose-200 text-xs font-semibold flex items-center justify-center gap-2 transition-all"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>{isAr ? 'ما زلت أخطئ فيها (أعدها لاحقاً)' : 'Still Got It Wrong (Repeat Later)'}</span>
                  </button>
                  <button
                    onClick={() => handleNextPractice(true)}
                    className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-lg transition-all hover:scale-[1.01]"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{isAr ? 'أتقنتها هذه المرة! (تمييز كمتقنة)' : 'Nailed It! (Mark Mastered)'}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : null}

        {/* Action Controls & Filters */}
        {!isPracticing && (
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between pt-1">
            <div className="flex flex-wrap items-center gap-2">
              {/* Practice Button */}
              {mistakes.length > 0 && (
                <button
                  onClick={handleStartPractice}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-rose-600 via-pink-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white text-xs font-semibold shadow-lg shadow-rose-900/30 flex items-center gap-2 transition-all hover:scale-105 active:scale-95"
                >
                  <Target className="w-3.5 h-3.5" />
                  <span>
                    {isAr
                      ? `بدء تدريب الأخطاء (${unmasteredMistakes.length || mistakes.length})`
                      : `Practice Mistakes (${unmasteredMistakes.length || mistakes.length})`}
                  </span>
                </button>
              )}

              {/* Add Mistake Manual Button */}
              <button
                onClick={() => setIsAdding(!isAdding)}
                className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-white text-xs font-medium flex items-center gap-1.5 transition-all"
              >
                {isAdding ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5 text-rose-400" />}
                <span>{isAdding ? (isAr ? 'إلغاء' : 'Cancel') : isAr ? 'إضافة مسألة يدوياً' : 'Add Mistake'}</span>
              </button>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-2">
              <select
                value={filterSubject}
                onChange={(e) => setFilterSubject(e.target.value)}
                className="bg-black/40 border border-white/10 text-white/80 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-rose-500/50"
              >
                <option value="all">{isAr ? 'كل المواد' : 'All Subjects'}</option>
                {THANAWEYA_SUBJECTS.map((sub) => (
                  <option key={sub.id} value={sub.name}>
                    {sub.name}
                  </option>
                ))}
              </select>

              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as any)}
                className="bg-black/40 border border-white/10 text-white/80 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-rose-500/50"
              >
                <option value="all">{isAr ? 'كل الحالات' : 'All Status'}</option>
                <option value="unmastered">{isAr ? 'تحتاج تدريب' : 'Needs Work'}</option>
                <option value="mastered">{isAr ? 'تم الإتقان' : 'Mastered'}</option>
              </select>
            </div>
          </div>
        )}

        {/* Add Mistake Form */}
        {isAdding && !isPracticing && (
          <form
            onSubmit={handleAdd}
            className="p-4 rounded-xl bg-white/[0.04] border border-rose-500/30 space-y-3 animate-in fade-in duration-200"
          >
            <div className="flex items-center gap-2 text-xs font-semibold text-rose-300 mb-1">
              <Plus className="w-3.5 h-3.5" />
              <span>{isAr ? 'تسجيل مسألة أو خطأ متكرر' : 'Log Mistake into Bank'}</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] text-white/60 block mb-1">{isAr ? 'المادة' : 'Subject'}</label>
                <select
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 text-white text-xs rounded-lg p-2 focus:outline-none focus:border-rose-500/50"
                >
                  {THANAWEYA_SUBJECTS.map((sub) => (
                    <option key={sub.id} value={sub.name}>
                      {sub.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] text-white/60 block mb-1">
                  {isAr ? 'الموضوع الفرعي (مثال: المعادلات التربيعية)' : 'Subtopic (e.g. Quadratics, Vectors)'}
                </label>
                <input
                  type="text"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder={isAr ? 'اسم الدرس أو المفهوم' : 'Topic name'}
                  className="w-full bg-black/40 border border-white/10 text-white text-xs rounded-lg p-2 focus:outline-none focus:border-rose-500/50"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] text-white/60 block mb-1">
                {isAr ? 'نص المسألة أو السؤال *' : 'Question / Problem Prompt *'}
              </label>
              <textarea
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                rows={2}
                placeholder={isAr ? 'اكتب المسألة أو نص السؤال الذي أخطأت فيه...' : 'Enter the question or problem...'}
                required
                className="w-full bg-black/40 border border-white/10 text-white text-xs rounded-lg p-2 focus:outline-none focus:border-rose-500/50"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] text-rose-300/80 block mb-1">
                  {isAr ? 'إجابتك الخاطئة السابقة (اختياري)' : 'Your Previous Wrong Answer'}
                </label>
                <input
                  type="text"
                  value={studentAnswer}
                  onChange={(e) => setStudentAnswer(e.target.value)}
                  placeholder={isAr ? 'ماذا كتبت أو كيف أخطأت؟' : 'What did you answer?'}
                  className="w-full bg-black/40 border border-rose-500/30 text-rose-200 text-xs rounded-lg p-2 focus:outline-none focus:border-rose-500/50"
                />
              </div>

              <div>
                <label className="text-[11px] text-emerald-300/80 block mb-1">
                  {isAr ? 'الحل / الإجابة الصحيحة *' : 'Correct Answer *'}
                </label>
                <input
                  type="text"
                  value={correctAnswer}
                  onChange={(e) => setCorrectAnswer(e.target.value)}
                  placeholder={isAr ? 'الحل النهائي الصحيح' : 'Correct solution'}
                  required
                  className="w-full bg-black/40 border border-emerald-500/30 text-emerald-200 text-xs rounded-lg p-2 focus:outline-none focus:border-emerald-500/50"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] text-white/60 block mb-1">
                  {isAr ? 'نوع الخطأ' : 'Error Classification'}
                </label>
                <select
                  value={mistakeType}
                  onChange={(e) => setMistakeType(e.target.value as any)}
                  className="w-full bg-black/40 border border-white/10 text-white text-xs rounded-lg p-2 focus:outline-none focus:border-rose-500/50"
                >
                  <option value="concept_gap">{isAr ? 'فجوة في الفهم (Concept Gap)' : 'Concept Gap'}</option>
                  <option value="sign_error">{isAr ? 'خطأ في الإشارات (+ / -)' : 'Sign Error'}</option>
                  <option value="calculation">{isAr ? 'خطأ حسابي (Calculation)' : 'Calculation'}</option>
                  <option value="careless">{isAr ? 'تسرع أو عدم تركيز (Careless)' : 'Careless Mistake'}</option>
                  <option value="unknown">{isAr ? 'أخرى' : 'Other'}</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] text-white/60 block mb-1">
                  {isAr ? 'الشرح والملاحظة لتجنب الخطأ' : 'Explanation & Tip'}
                </label>
                <input
                  type="text"
                  value={explanation}
                  onChange={(e) => setExplanation(e.target.value)}
                  placeholder={isAr ? 'لماذا الإجابة الصحيحة هكذا؟' : 'Why is this correct?'}
                  className="w-full bg-black/40 border border-white/10 text-white text-xs rounded-lg p-2 focus:outline-none focus:border-rose-500/50"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                className="px-3 py-1.5 rounded-lg text-xs text-white/60 hover:text-white"
              >
                {isAr ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold transition-colors"
              >
                {isAr ? 'حفظ المسألة' : 'Save to Mistake Bank'}
              </button>
            </div>
          </form>
        )}

        {/* Mistakes List */}
        {!isPracticing && (
          <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
            {filteredMistakes.length === 0 ? (
              <div className="p-8 text-center rounded-xl bg-white/[0.02] border border-white/5 space-y-2">
                <BookX className="w-8 h-8 text-white/20 mx-auto" />
                <p className="text-xs text-white/50">
                  {isAr
                    ? 'لا توجد أخطاء مسجلة في هذا التصنيف. أضف مسألة أو سجل أخطاءك أثناء المذاكرة!'
                    : 'No mistakes found in this filter. Add questions or log errors as you practice!'}
                </p>
              </div>
            ) : (
              filteredMistakes.map((item) => (
                <div
                  key={item.id}
                  className={`p-4 rounded-xl border transition-all ${
                    item.is_mastered
                      ? 'bg-white/[0.02] border-white/10 opacity-70 hover:opacity-100'
                      : 'bg-rose-500/[0.03] border-rose-500/20 hover:border-rose-500/40'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-rose-300">{item.subject}</span>
                      {item.topic && (
                        <span className="text-[11px] px-2 py-0.5 rounded-md bg-white/5 text-white/70 border border-white/10">
                          {item.topic}
                        </span>
                      )}
                      {(item.times_repeated || 1) > 1 && (
                        <span className="text-[10px] px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-300 font-mono font-bold border border-rose-500/30">
                          ×{item.times_repeated} {isAr ? 'تكرار' : 'repeats'}
                        </span>
                      )}
                      {item.is_mastered ? (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 font-semibold border border-emerald-500/30 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                          <span>{isAr ? 'متقنة' : 'Mastered'}</span>
                        </span>
                      ) : (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 font-semibold border border-amber-500/30 flex items-center gap-1">
                          <RotateCcw className="w-3 h-3 text-amber-400" />
                          <span>{isAr ? 'تحتاج مراجعة' : 'Needs Review'}</span>
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => markMistakeMastered(item.id, !item.is_mastered)}
                        title={item.is_mastered ? (isAr ? 'إعادة للمراجعة' : 'Re-open') : isAr ? 'تمييز كمتقنة' : 'Mark mastered'}
                        className={`p-1.5 rounded-lg border transition-all ${
                          item.is_mastered
                            ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/30'
                            : 'bg-white/5 border-white/10 text-white/50 hover:text-emerald-300 hover:bg-emerald-500/10'
                        }`}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => deleteMistake(item.id)}
                        className="p-1.5 rounded-lg border border-transparent hover:border-red-500/30 text-white/40 hover:text-red-400 hover:bg-red-500/10 transition-all"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Question */}
                  <p className="text-xs sm:text-sm font-medium text-white/90 mb-3 whitespace-pre-wrap">
                    {item.question}
                  </p>

                  {/* Answers Comparison */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    {item.student_answer && (
                      <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300">
                        <span className="font-semibold block text-[10px] uppercase tracking-wider text-rose-400 mb-0.5">
                          {isAr ? 'خطؤك السابق' : 'Past Mistake'}
                        </span>
                        <span>{item.student_answer}</span>
                      </div>
                    )}

                    <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300">
                      <span className="font-semibold block text-[10px] uppercase tracking-wider text-emerald-400 mb-0.5">
                        {isAr ? 'الحل الصحيح' : 'Correct Solution'}
                      </span>
                      <span>{item.correct_answer}</span>
                    </div>
                  </div>

                  {/* Explanation */}
                  {item.explanation && (
                    <div className="mt-2 p-2.5 rounded-lg bg-white/[0.03] border border-white/5 text-[11px] text-white/70">
                      <span className="font-semibold text-white/90">{isAr ? 'ملاحظة: ' : 'Tip / Note: '}</span>
                      <span>{item.explanation}</span>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </GlassModal>
  );
}
