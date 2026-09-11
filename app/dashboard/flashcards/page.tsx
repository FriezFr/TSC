'use client';

import React, { useState } from 'react';
import { useApp } from '@/lib/context';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassModal } from '@/components/ui/GlassModal';
import {
  BrainCircuit,
  Plus,
  RotateCw,
  Check,
  X,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  AlertTriangle,
  BookOpen,
} from 'lucide-react';
import { THANAWEYA_SUBJECTS } from '@/lib/types';
import confetti from 'canvas-confetti';

export default function FlashcardsPage() {
  const { decks, flashcards, addDeck, addFlashcard, recordCardReview } = useApp();

  const [activeDeckId, setActiveDeckId] = useState<string>(decks[0]?.id || '');
  const [isQuizMode, setIsQuizMode] = useState<boolean>(false);
  const [quizCardIndex, setQuizCardIndex] = useState<number>(0);
  const [isFlipped, setIsFlipped] = useState<boolean>(false);

  // Modals
  const [isDeckModalOpen, setIsDeckModalOpen] = useState(false);
  const [isCardModalOpen, setIsCardModalOpen] = useState(false);

  // Deck Form
  const [deckSubject, setDeckSubject] = useState('Physics');
  const [deckTitle, setDeckTitle] = useState('');
  const [deckDesc, setDeckDesc] = useState('');

  // Card Form
  const [cardQuestion, setCardQuestion] = useState('');
  const [cardAnswer, setCardAnswer] = useState('');

  const currentDeck = decks.find((d) => d.id === activeDeckId) || decks[0];
  const currentDeckCards = flashcards.filter((c) => c.deck_id === currentDeck?.id);

  // Frequently missed cards (accuracy < 65% with at least 3 reviews)
  const missedCards = flashcards.filter(
    (c) => c.times_reviewed >= 2 && (c.times_correct / c.times_reviewed) < 0.65
  );

  const handleAddDeck = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deckTitle.trim()) return;
    await addDeck(deckSubject, deckTitle.trim(), deckDesc.trim() || undefined);
    setDeckTitle('');
    setDeckDesc('');
    setIsDeckModalOpen(false);
  };

  const handleAddCard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentDeck || !cardQuestion.trim() || !cardAnswer.trim()) return;
    await addFlashcard(currentDeck.id, cardQuestion.trim(), cardAnswer.trim());
    setCardQuestion('');
    setCardAnswer('');
    setIsCardModalOpen(false);
  };

  const handleQuizAnswer = async (isCorrect: boolean) => {
    const card = currentDeckCards[quizCardIndex];
    if (card) {
      await recordCardReview(card.id, isCorrect);
    }

    if (isCorrect && quizCardIndex === currentDeckCards.length - 1) {
      confetti({
        particleCount: 50,
        spread: 80,
        origin: { y: 0.6 },
      });
    }

    setIsFlipped(false);
    if (quizCardIndex < currentDeckCards.length - 1) {
      setQuizCardIndex((prev) => prev + 1);
    } else {
      // Finished quiz
      setIsQuizMode(false);
      setQuizCardIndex(0);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shadow-[0_0_15px_rgba(99,102,241,0.15)]">
              <BrainCircuit className="w-5 h-5" />
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight">
              Flashcards & Quiz Engine
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Active recall and spaced repetition for Egyptian Thanaweya formulas, definitions & Adab.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setIsDeckModalOpen(true)}
            className="px-3.5 py-2 rounded-2xl glass-button-secondary text-xs font-semibold flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Deck</span>
          </button>
          <button
            onClick={() => setIsCardModalOpen(true)}
            disabled={!currentDeck}
            className="px-4 py-2 rounded-2xl glass-button-primary text-xs font-bold flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Card</span>
          </button>
        </div>
      </div>

      {/* Quiz Mode View vs Decks View */}
      {isQuizMode && currentDeckCards.length > 0 ? (
        <div className="max-w-2xl mx-auto space-y-6 animate-fadeIn">
          <div className="flex items-center justify-between">
            <button
              onClick={() => {
                setIsQuizMode(false);
                setIsFlipped(false);
                setQuizCardIndex(0);
              }}
              className="text-xs text-slate-400 hover:text-white flex items-center gap-1"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Exit Quiz Mode</span>
            </button>
            <span className="text-xs font-mono text-cyan-300 font-bold bg-cyan-500/10 px-3 py-1 rounded-full border border-cyan-500/20">
              Card {quizCardIndex + 1} of {currentDeckCards.length}
            </span>
          </div>

          {/* 3D Flip Card Container */}
          <div
            onClick={() => setIsFlipped(!isFlipped)}
            className="cursor-pointer perspective-1000 min-h-[300px] sm:min-h-[350px] w-full select-none"
          >
            <div
              className={`relative w-full h-full min-h-[300px] sm:min-h-[350px] rounded-3xl transition-transform duration-500 transform-style-3d ${
                isFlipped ? 'rotate-y-180' : ''
              }`}
            >
              {/* Card Front (Question) */}
              <div className="absolute inset-0 backface-hidden glass-panel rounded-3xl p-8 flex flex-col justify-between border border-white/15 shadow-2xl text-center">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span className="text-cyan-400 font-semibold">{currentDeck?.subject}</span>
                  <span className="flex items-center gap-1">
                    <RotateCw className="w-3.5 h-3.5" /> Tap to reveal answer
                  </span>
                </div>

                <div className="my-auto py-6">
                  <span className="text-[11px] uppercase tracking-widest text-slate-400 font-semibold block mb-3">
                    Question
                  </span>
                  <p className="text-xl sm:text-2xl font-bold text-white leading-relaxed">
                    {currentDeckCards[quizCardIndex]?.question}
                  </p>
                </div>

                <p className="text-[11px] text-slate-500 font-medium">
                  {currentDeck?.title}
                </p>
              </div>

              {/* Card Back (Answer) */}
              <div className="absolute inset-0 backface-hidden rotate-y-180 glass-panel rounded-3xl p-8 flex flex-col justify-between border border-cyan-500/30 shadow-[0_0_35px_rgba(0,240,255,0.15)] text-center">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span className="text-emerald-400 font-semibold">Answer Revealed</span>
                  <span className="flex items-center gap-1">
                    <RotateCw className="w-3.5 h-3.5" /> Tap to flip back
                  </span>
                </div>

                <div className="my-auto py-6">
                  <span className="text-[11px] uppercase tracking-widest text-emerald-400 font-semibold block mb-3">
                    Model Answer / Explanation
                  </span>
                  <p className="text-lg sm:text-xl font-bold text-slate-100 leading-relaxed">
                    {currentDeckCards[quizCardIndex]?.answer}
                  </p>
                </div>

                <p className="text-[11px] text-slate-400">
                  How well did you know this?
                </p>
              </div>
            </div>
          </div>

          {/* Answer Controls */}
          {isFlipped && (
            <div className="flex items-center justify-center gap-4 animate-fadeIn">
              <button
                onClick={() => handleQuizAnswer(false)}
                className="flex-1 py-3 rounded-2xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-lg"
              >
                <X className="w-4 h-4" />
                <span>Needs Review (Hard)</span>
              </button>
              <button
                onClick={() => handleQuizAnswer(true)}
                className="flex-1 py-3 rounded-2xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-lg"
              >
                <Check className="w-4 h-4" />
                <span>Got It Right! (Mastered)</span>
              </button>
            </div>
          )}
        </div>
      ) : (
        /* Normal Deck Browse & Cards View */
        <div className="space-y-6">
          {/* Deck Horizontal Selector Pills */}
          <div className="flex items-center gap-3 overflow-x-auto pb-2">
            {decks.map((deck) => {
              const isSelected = deck.id === currentDeck?.id;
              const cardCount = flashcards.filter((c) => c.deck_id === deck.id).length;

              return (
                <button
                  key={deck.id}
                  onClick={() => setActiveDeckId(deck.id)}
                  className={`px-4 py-3 rounded-2xl text-left shrink-0 transition-all border ${
                    isSelected
                      ? 'bg-cyan-500/15 border-cyan-400/40 shadow-[0_0_20px_rgba(0,240,255,0.15)]'
                      : 'glass-panel-subtle hover:bg-white/[0.05]'
                  }`}
                >
                  <span className="text-[10px] font-semibold text-cyan-400 uppercase tracking-wider block">
                    {deck.subject}
                  </span>
                  <h4 className="text-xs font-bold text-white mt-0.5">{deck.title}</h4>
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    {cardCount} {cardCount === 1 ? 'card' : 'cards'}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Active Deck Header */}
          {currentDeck && (
            <GlassCard glow className="p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <span className="text-xs font-bold text-cyan-400">{currentDeck.subject}</span>
                  <h2 className="text-xl font-black text-white mt-0.5">{currentDeck.title}</h2>
                  {currentDeck.description && (
                    <p className="text-xs text-slate-400 mt-1">{currentDeck.description}</p>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => {
                      if (currentDeckCards.length > 0) {
                        setQuizCardIndex(0);
                        setIsFlipped(false);
                        setIsQuizMode(true);
                      }
                    }}
                    disabled={currentDeckCards.length === 0}
                    className="px-5 py-2.5 rounded-2xl glass-button-primary text-xs font-bold flex items-center gap-2 shadow-[0_0_20px_rgba(0,240,255,0.3)] disabled:opacity-50"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>Start Quiz Mode ({currentDeckCards.length})</span>
                  </button>
                </div>
              </div>
            </GlassCard>
          )}

          {/* Cards in Deck Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {currentDeckCards.map((card) => {
              const accuracy =
                card.times_reviewed > 0
                  ? ((card.times_correct / card.times_reviewed) * 100).toFixed(0)
                  : null;

              return (
                <GlassCard key={card.id} interactive className="p-5 flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
                      Q: Question
                    </span>
                    <h3 className="text-sm font-bold text-white leading-relaxed">
                      {card.question}
                    </h3>

                    <div className="mt-4 pt-3 border-t border-white/10">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 block mb-1">
                        A: Answer
                      </span>
                      <p className="text-xs text-slate-300 line-clamp-3 leading-relaxed">
                        {card.answer}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-[11px] text-slate-400 font-mono">
                    <span>Reviews: {card.times_reviewed}</span>
                    {accuracy !== null && (
                      <span
                        className={`font-semibold ${
                          Number(accuracy) >= 70 ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        Mastery: {accuracy}%
                      </span>
                    )}
                  </div>
                </GlassCard>
              );
            })}
          </div>

          {/* Frequently Missed Cards Alert Box */}
          {missedCards.length > 0 && (
            <GlassCard className="p-6 border border-rose-500/30">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="w-4 h-4 text-rose-400" />
                <h3 className="text-sm font-bold text-white">
                  Frequently Missed Cards (Needs Focus)
                </h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {missedCards.map((mc) => (
                  <div
                    key={mc.id}
                    className="p-3 rounded-2xl bg-rose-500/5 border border-rose-500/15"
                  >
                    <p className="text-xs font-semibold text-slate-200">{mc.question}</p>
                    <span className="text-[10px] text-rose-400 font-mono mt-1 block">
                      Score: {mc.times_correct}/{mc.times_reviewed} correct
                    </span>
                  </div>
                ))}
              </div>
            </GlassCard>
          )}
        </div>
      )}

      {/* Add Deck Modal */}
      <GlassModal
        isOpen={isDeckModalOpen}
        onClose={() => setIsDeckModalOpen(false)}
        title="Create Flashcard Deck"
      >
        <form onSubmit={handleAddDeck} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Subject (المادة)
            </label>
            <select
              value={deckSubject}
              onChange={(e) => setDeckSubject(e.target.value)}
              className="w-full glass-input px-3.5 py-2.5 rounded-xl text-xs bg-slate-900 text-slate-100"
            >
              {THANAWEYA_SUBJECTS.map((s) => (
                <option key={s.id} value={s.name.split(' ')[0]}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Deck Title (عنوان المجموعة)
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Modern Physics Formulas & Constants"
              value={deckTitle}
              onChange={(e) => setDeckTitle(e.target.value)}
              className="w-full glass-input px-3.5 py-2.5 rounded-xl text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Description
            </label>
            <input
              type="text"
              placeholder="e.g. Chapters 5 to 8 blackbody radiation, Compton, laser"
              value={deckDesc}
              onChange={(e) => setDeckDesc(e.target.value)}
              className="w-full glass-input px-3.5 py-2.5 rounded-xl text-xs"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsDeckModalOpen(false)}
              className="px-4 py-2 rounded-xl glass-button-secondary text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl glass-button-primary text-xs font-bold"
            >
              Create Deck
            </button>
          </div>
        </form>
      </GlassModal>

      {/* Add Card Modal */}
      <GlassModal
        isOpen={isCardModalOpen}
        onClose={() => setIsCardModalOpen(false)}
        title={`Add Flashcard to "${currentDeck?.title || 'Deck'}"`}
      >
        <form onSubmit={handleAddCard} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Front: Question / Concept
            </label>
            <textarea
              rows={3}
              required
              placeholder="e.g. What is the condition for resonance in an R-L-C series circuit?"
              value={cardQuestion}
              onChange={(e) => setCardQuestion(e.target.value)}
              className="w-full glass-input px-3.5 py-2.5 rounded-xl text-sm resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Back: Model Answer / Explanation
            </label>
            <textarea
              rows={3}
              required
              placeholder="e.g. Inductive reactance equals capacitive reactance (XL = XC), impedance Z = R (minimum), current is maximum and in phase with voltage."
              value={cardAnswer}
              onChange={(e) => setCardAnswer(e.target.value)}
              className="w-full glass-input px-3.5 py-2.5 rounded-xl text-sm resize-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsCardModalOpen(false)}
              className="px-4 py-2 rounded-xl glass-button-secondary text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl glass-button-primary text-xs font-bold"
            >
              Add Card
            </button>
          </div>
        </form>
      </GlassModal>
    </div>
  );
}
