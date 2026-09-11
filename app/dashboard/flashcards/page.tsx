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
  ArrowLeft,
  Sparkles,
} from 'lucide-react';
import { THANAWEYA_SUBJECTS } from '@/lib/types';

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

    setIsFlipped(false);
    if (quizCardIndex < currentDeckCards.length - 1) {
      setQuizCardIndex((prev) => prev + 1);
    } else {
      setIsQuizMode(false);
      setQuizCardIndex(0);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Flashcards & Quiz
          </h1>
          <p className="text-xs text-neutral-400 mt-1">
            Active recall and revision decks.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsDeckModalOpen(true)}
            className="px-3.5 py-2 rounded-xl glass-button-secondary text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Deck</span>
          </button>
          <button
            onClick={() => setIsCardModalOpen(true)}
            disabled={!currentDeck}
            className="px-4 py-2 rounded-xl glass-button-primary text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Card</span>
          </button>
        </div>
      </div>

      {isQuizMode && currentDeckCards.length > 0 ? (
        <div className="max-w-xl mx-auto space-y-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => {
                setIsQuizMode(false);
                setIsFlipped(false);
                setQuizCardIndex(0);
              }}
              className="text-xs text-neutral-400 hover:text-white flex items-center gap-1 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Exit Quiz</span>
            </button>
            <span className="text-xs font-mono text-neutral-400">
              {quizCardIndex + 1} / {currentDeckCards.length}
            </span>
          </div>

          <div
            onClick={() => setIsFlipped(!isFlipped)}
            className="cursor-pointer perspective-1000 min-h-[280px] w-full select-none"
          >
            <div
              className={`relative w-full h-full min-h-[280px] rounded-2xl transition-transform duration-500 transform-style-3d ${
                isFlipped ? 'rotate-y-180' : ''
              }`}
            >
              {/* Front */}
              <div className="absolute inset-0 backface-hidden bg-[#0c0c0c] rounded-2xl p-8 flex flex-col justify-between border border-white/10 text-center">
                <div className="flex items-center justify-between text-xs text-neutral-400">
                  <span>{currentDeck?.subject}</span>
                  <span className="flex items-center gap-1 text-[11px]">
                    <RotateCw className="w-3 h-3" /> Tap to reveal answer
                  </span>
                </div>

                <p className="text-xl font-bold text-white my-auto py-6">
                  {currentDeckCards[quizCardIndex]?.question}
                </p>

                <p className="text-[11px] text-neutral-500">{currentDeck?.title}</p>
              </div>

              {/* Back */}
              <div className="absolute inset-0 backface-hidden rotate-y-180 bg-[#111111] rounded-2xl p-8 flex flex-col justify-between border border-white/20 text-center">
                <div className="flex items-center justify-between text-xs text-neutral-400">
                  <span>Answer</span>
                  <span className="flex items-center gap-1 text-[11px]">
                    <RotateCw className="w-3 h-3" /> Tap to flip back
                  </span>
                </div>

                <p className="text-lg font-medium text-neutral-100 my-auto py-6">
                  {currentDeckCards[quizCardIndex]?.answer}
                </p>

                <p className="text-[11px] text-neutral-500">Rate your recall</p>
              </div>
            </div>
          </div>

          {isFlipped && (
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => handleQuizAnswer(false)}
                className="flex-1 py-2.5 rounded-xl bg-red-950/40 text-red-300 border border-red-800 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <X className="w-4 h-4" />
                <span>Needs Practice</span>
              </button>
              <button
                onClick={() => handleQuizAnswer(true)}
                className="flex-1 py-2.5 rounded-xl bg-white text-black text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>Got It Right</span>
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {decks.length === 0 ? (
            <GlassCard className="p-12 text-center text-neutral-500 space-y-2">
              <BrainCircuit className="w-8 h-8 mx-auto text-neutral-600" />
              <p className="text-sm font-semibold text-neutral-300">No decks created yet</p>
              <p className="text-xs">Click "+ New Deck" to create your first flashcard deck.</p>
            </GlassCard>
          ) : (
            <>
              {/* Deck Pills */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                {decks.map((deck) => {
                  const isSelected = deck.id === currentDeck?.id;
                  const count = flashcards.filter((c) => c.deck_id === deck.id).length;

                  return (
                    <button
                      key={deck.id}
                      onClick={() => setActiveDeckId(deck.id)}
                      className={`px-3 py-2 rounded-xl text-left shrink-0 transition-all border cursor-pointer ${
                        isSelected
                          ? 'bg-white text-black border-white'
                          : 'bg-[#0d0d0d] text-neutral-300 border-white/10 hover:border-white/20'
                      }`}
                    >
                      <span className={`text-[10px] block font-mono ${isSelected ? 'text-black font-bold' : 'text-neutral-500'}`}>
                        {deck.subject}
                      </span>
                      <h4 className="text-xs font-bold mt-0.5">{deck.title}</h4>
                      <span className={`text-[10px] block ${isSelected ? 'text-neutral-700' : 'text-neutral-500'}`}>
                        {count} cards
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Active Deck Header */}
              {currentDeck && (
                <GlassCard className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <span className="text-xs text-neutral-500 font-mono">{currentDeck.subject}</span>
                    <h2 className="text-lg font-bold text-white mt-0.5">{currentDeck.title}</h2>
                    {currentDeck.description && (
                      <p className="text-xs text-neutral-400 mt-1">{currentDeck.description}</p>
                    )}
                  </div>

                  <button
                    onClick={() => {
                      if (currentDeckCards.length > 0) {
                        setQuizCardIndex(0);
                        setIsFlipped(false);
                        setIsQuizMode(true);
                      }
                    }}
                    disabled={currentDeckCards.length === 0}
                    className="px-5 py-2 rounded-xl glass-button-primary text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Start Quiz ({currentDeckCards.length})</span>
                  </button>
                </GlassCard>
              )}

              {/* Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {currentDeckCards.map((card) => (
                  <GlassCard key={card.id} className="p-4 flex flex-col justify-between">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-neutral-500 block mb-1">
                        Question
                      </span>
                      <h3 className="text-xs font-bold text-white">{card.question}</h3>

                      <div className="mt-3 pt-2 border-t border-white/5">
                        <span className="text-[10px] uppercase font-bold text-neutral-500 block mb-1">
                          Answer
                        </span>
                        <p className="text-xs text-neutral-300">{card.answer}</p>
                      </div>
                    </div>

                    <div className="mt-3 pt-2 border-t border-white/5 text-[10px] text-neutral-500 font-mono flex items-center justify-between">
                      <span>Reviewed: {card.times_reviewed}x</span>
                      <span>Correct: {card.times_correct}x</span>
                    </div>
                  </GlassCard>
                ))}
              </div>
            </>
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
            <label className="block text-xs font-medium text-neutral-300 mb-1">Subject</label>
            <select
              value={deckSubject}
              onChange={(e) => setDeckSubject(e.target.value)}
              className="w-full glass-input px-3 py-2 rounded-xl text-xs bg-[#0d0d0d] text-white"
            >
              {THANAWEYA_SUBJECTS.map((s) => (
                <option key={s.id} value={s.name.split(' ')[0]}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-300 mb-1">Deck Title</label>
            <input
              type="text"
              required
              value={deckTitle}
              onChange={(e) => setDeckTitle(e.target.value)}
              className="w-full glass-input px-3 py-2 rounded-xl text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-300 mb-1">Description (Optional)</label>
            <input
              type="text"
              value={deckDesc}
              onChange={(e) => setDeckDesc(e.target.value)}
              className="w-full glass-input px-3 py-2 rounded-xl text-xs"
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
              Create
            </button>
          </div>
        </form>
      </GlassModal>

      {/* Add Card Modal */}
      <GlassModal
        isOpen={isCardModalOpen}
        onClose={() => setIsCardModalOpen(false)}
        title={`Add Card to ${currentDeck?.title || 'Deck'}`}
      >
        <form onSubmit={handleAddCard} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-neutral-300 mb-1">Question</label>
            <textarea
              rows={3}
              required
              value={cardQuestion}
              onChange={(e) => setCardQuestion(e.target.value)}
              className="w-full glass-input px-3 py-2 rounded-xl text-xs resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-300 mb-1">Answer</label>
            <textarea
              rows={3}
              required
              value={cardAnswer}
              onChange={(e) => setCardAnswer(e.target.value)}
              className="w-full glass-input px-3 py-2 rounded-xl text-xs resize-none"
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
