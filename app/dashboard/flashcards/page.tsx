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
  Trash2,
  AlertTriangle,
} from 'lucide-react';
import { THANAWEYA_SUBJECTS } from '@/lib/types';

export default function FlashcardsPage() {
  const {
    decks,
    flashcards,
    addDeck,
    addFlashcard,
    deleteFlashcard,
    deleteDeck,
    recordCardReview,
    t,
  } = useApp();

  const [activeDeckId, setActiveDeckId] = useState<string>(decks[0]?.id || '');
  const [isQuizMode, setIsQuizMode] = useState<boolean>(false);
  const [quizCardIndex, setQuizCardIndex] = useState<number>(0);
  const [isFlipped, setIsFlipped] = useState<boolean>(false);

  // Modals
  const [isDeckModalOpen, setIsDeckModalOpen] = useState(false);
  const [isCardModalOpen, setIsCardModalOpen] = useState(false);
  const [isDeleteDeckModalOpen, setIsDeleteDeckModalOpen] = useState(false);
  const [cardToDelete, setCardToDelete] = useState<string | null>(null);

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

  const handleDeleteDeck = async () => {
    if (!currentDeck) return;
    const targetId = currentDeck.id;
    await deleteDeck(targetId);
    setIsDeleteDeckModalOpen(false);
    const remaining = decks.filter((d) => d.id !== targetId);
    if (remaining.length > 0) {
      setActiveDeckId(remaining[0].id);
    } else {
      setActiveDeckId('');
    }
  };

  const handleDeleteCardConfirm = async () => {
    if (!cardToDelete) return;
    await deleteFlashcard(cardToDelete);
    setCardToDelete(null);
  };

  const handleQuizDeleteCurrent = async () => {
    const card = currentDeckCards[quizCardIndex];
    if (!card) return;
    await deleteFlashcard(card.id);
    if (currentDeckCards.length <= 1) {
      setIsQuizMode(false);
      setQuizCardIndex(0);
    } else if (quizCardIndex >= currentDeckCards.length - 1) {
      setQuizCardIndex((prev) => Math.max(0, prev - 1));
      setIsFlipped(false);
    }
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
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            {t('flashcardsTitle')}
          </h1>
          <p className="text-xs text-neutral-400 mt-1">
            {t('flashcardsSubtitle')}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsDeckModalOpen(true)}
            className="px-3.5 py-2 rounded-xl glass-button-secondary text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{t('newDeck')}</span>
          </button>
          <button
            onClick={() => setIsCardModalOpen(true)}
            disabled={!currentDeck}
            className="px-4 py-2 rounded-xl glass-button-primary text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{t('addCard')}</span>
          </button>
        </div>
      </div>

      {/* Quiz Mode */}
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
              <span>{t('exitQuiz')}</span>
            </button>

            <div className="flex items-center gap-3">
              <span className="text-xs font-mono text-neutral-400">
                {quizCardIndex + 1} / {currentDeckCards.length}
              </span>
              <button
                onClick={handleQuizDeleteCurrent}
                title="Delete this card"
                className="text-neutral-500 hover:text-red-400 p-1 rounded-lg hover:bg-red-500/10 transition-all cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
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
              <div className="absolute inset-0 backface-hidden bg-[#0c0c0c] rounded-2xl p-8 flex flex-col justify-between border border-white/10 text-center shadow-2xl">
                <div className="flex items-center justify-between text-xs text-neutral-400">
                  <span>{currentDeck?.subject}</span>
                  <span className="flex items-center gap-1 text-[11px] text-neutral-400">
                    <RotateCw className="w-3 h-3" /> {t('tapToReveal')}
                  </span>
                </div>

                <p className="text-xl font-bold text-white my-auto py-6">
                  {currentDeckCards[quizCardIndex]?.question}
                </p>

                <p className="text-[11px] text-neutral-500">{currentDeck?.title}</p>
              </div>

              {/* Back */}
              <div className="absolute inset-0 backface-hidden rotate-y-180 bg-[#111111] rounded-2xl p-8 flex flex-col justify-between border border-white/20 text-center shadow-2xl">
                <div className="flex items-center justify-between text-xs text-neutral-400">
                  <span>{t('answerLabel')}</span>
                  <span className="flex items-center gap-1 text-[11px] text-neutral-400">
                    <RotateCw className="w-3 h-3" /> {t('tapToFlipBack')}
                  </span>
                </div>

                <p className="text-lg font-medium text-neutral-100 my-auto py-6">
                  {currentDeckCards[quizCardIndex]?.answer}
                </p>

                <p className="text-[11px] text-neutral-500">{t('rateRecall')}</p>
              </div>
            </div>
          </div>

          {isFlipped && (
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => handleQuizAnswer(false)}
                className="flex-1 py-2.5 rounded-xl bg-red-950/40 text-red-300 border border-red-800 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer hover:bg-red-950/70 transition-all"
              >
                <X className="w-4 h-4" />
                <span>{t('needsPractice')}</span>
              </button>
              <button
                onClick={() => handleQuizAnswer(true)}
                className="flex-1 py-2.5 rounded-xl bg-white text-black text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer hover:bg-neutral-200 transition-all"
              >
                <Check className="w-4 h-4" />
                <span>{t('gotItRight')}</span>
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {decks.length === 0 ? (
            <GlassCard className="p-12 text-center text-neutral-500 space-y-2">
              <BrainCircuit className="w-8 h-8 mx-auto text-neutral-600" />
              <p className="text-sm font-semibold text-neutral-300">{t('noDecks')}</p>
              <p className="text-xs">{t('noDecksDesc')}</p>
            </GlassCard>
          ) : (
            <>
              {/* Deck Pills */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                {decks.map((deck) => {
                  const isSelected = deck.id === currentDeck?.id;
                  const count = flashcards.filter((c) => c.deck_id === deck.id).length;

                  return (
                    <button
                      key={deck.id}
                      onClick={() => setActiveDeckId(deck.id)}
                      className={`px-3.5 py-2.5 rounded-xl text-left shrink-0 transition-all border cursor-pointer ${
                        isSelected
                          ? 'bg-white text-black border-white shadow-lg'
                          : 'bg-[#0d0d0d] text-neutral-300 border-white/10 hover:border-white/20'
                      }`}
                    >
                      <span
                        className={`text-[10px] block font-mono ${
                          isSelected ? 'text-black font-bold' : 'text-neutral-500'
                        }`}
                      >
                        {deck.subject}
                      </span>
                      <h4 className="text-xs font-bold mt-0.5">{deck.title}</h4>
                      <span
                        className={`text-[10px] block ${
                          isSelected ? 'text-neutral-700' : 'text-neutral-500'
                        }`}
                      >
                        {count} cards
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Active Deck Header */}
              {currentDeck && (
                <GlassCard className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <span className="text-xs text-neutral-500 font-mono">
                      {currentDeck.subject}
                    </span>
                    <h2 className="text-lg font-bold text-white tracking-tight">
                      {currentDeck.title}
                    </h2>
                    {currentDeck.description && (
                      <p className="text-xs text-neutral-400">{currentDeck.description}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        if (currentDeckCards.length > 0) {
                          setQuizCardIndex(0);
                          setIsFlipped(false);
                          setIsQuizMode(true);
                        }
                      }}
                      disabled={currentDeckCards.length === 0}
                      className="px-4 py-2 rounded-xl glass-button-primary text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>
                        {t('quizMode')} ({currentDeckCards.length})
                      </span>
                    </button>

                    <button
                      onClick={() => setIsDeleteDeckModalOpen(true)}
                      className="p-2 rounded-xl border border-red-900/40 bg-red-950/20 text-red-400 hover:bg-red-950/50 hover:text-red-300 transition-all cursor-pointer"
                      title={t('deleteDeck')}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </GlassCard>
              )}

              {/* Empty Deck Cards State */}
              {currentDeckCards.length === 0 ? (
                <GlassCard className="p-10 text-center text-neutral-500 space-y-3">
                  <BrainCircuit className="w-8 h-8 mx-auto text-neutral-600" />
                  <p className="text-xs font-semibold text-neutral-300">
                    This deck has no cards yet.
                  </p>
                  <button
                    onClick={() => setIsCardModalOpen(true)}
                    className="px-4 py-2 rounded-xl glass-button-primary text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{t('addCard')}</span>
                  </button>
                </GlassCard>
              ) : (
                /* Cards Grid */
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {currentDeckCards.map((card) => (
                    <GlassCard
                      key={card.id}
                      className="p-4 flex flex-col justify-between group relative hover:border-white/20 transition-all"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] uppercase font-bold text-neutral-500">
                            {t('questionLabel')}
                          </span>
                          <button
                            onClick={() => setCardToDelete(card.id)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-neutral-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg cursor-pointer"
                            title={t('deleteCard')}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <h3 className="text-xs font-bold text-white leading-relaxed">
                          {card.question}
                        </h3>

                        <div className="mt-3 pt-2.5 border-t border-white/5">
                          <span className="text-[10px] uppercase font-bold text-neutral-500 block mb-1">
                            {t('answerLabel')}
                          </span>
                          <p className="text-xs text-neutral-300 leading-relaxed">
                            {card.answer}
                          </p>
                        </div>
                      </div>

                      <div className="mt-3 pt-2.5 border-t border-white/5 text-[10px] text-neutral-500 font-mono flex items-center justify-between">
                        <span>
                          {t('reviewedCount')}: {card.times_reviewed}x
                        </span>
                        <span>
                          {t('correctCount')}: {card.times_correct}x
                        </span>
                      </div>
                    </GlassCard>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Add Deck Modal */}
      <GlassModal
        isOpen={isDeckModalOpen}
        onClose={() => setIsDeckModalOpen(false)}
        title={t('createDeckTitle')}
      >
        <form onSubmit={handleAddDeck} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-neutral-300 mb-1">
              {t('subjectLabel')}
            </label>
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
            <label className="block text-xs font-medium text-neutral-300 mb-1">
              {t('deckTitleLabel')}
            </label>
            <input
              type="text"
              required
              value={deckTitle}
              onChange={(e) => setDeckTitle(e.target.value)}
              className="w-full glass-input px-3 py-2 rounded-xl text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-300 mb-1">
              {t('deckDescLabel')}
            </label>
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
              {t('cancel')}
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl glass-button-primary text-xs font-bold"
            >
              {t('confirm')}
            </button>
          </div>
        </form>
      </GlassModal>

      {/* Add Card Modal */}
      <GlassModal
        isOpen={isCardModalOpen}
        onClose={() => setIsCardModalOpen(false)}
        title={`${t('addCard')} - ${currentDeck?.title || ''}`}
      >
        <form onSubmit={handleAddCard} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-neutral-300 mb-1">
              {t('questionLabel')}
            </label>
            <textarea
              rows={3}
              required
              value={cardQuestion}
              onChange={(e) => setCardQuestion(e.target.value)}
              className="w-full glass-input px-3 py-2 rounded-xl text-xs resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-300 mb-1">
              {t('answerLabel')}
            </label>
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
              {t('cancel')}
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl glass-button-primary text-xs font-bold"
            >
              {t('addCard')}
            </button>
          </div>
        </form>
      </GlassModal>

      {/* Delete Deck Confirmation Modal */}
      <GlassModal
        isOpen={isDeleteDeckModalOpen}
        onClose={() => setIsDeleteDeckModalOpen(false)}
        title={t('deleteDeck')}
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-3 bg-red-950/20 border border-red-900/30 rounded-xl text-red-300">
            <AlertTriangle className="w-5 h-5 shrink-0 text-red-400" />
            <p className="text-xs leading-relaxed">{t('deleteDeckConfirm')}</p>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsDeleteDeckModalOpen(false)}
              className="px-4 py-2 rounded-xl glass-button-secondary text-xs"
            >
              {t('cancel')}
            </button>
            <button
              type="button"
              onClick={handleDeleteDeck}
              className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition-all cursor-pointer"
            >
              {t('deleteDeck')}
            </button>
          </div>
        </div>
      </GlassModal>

      {/* Delete Card Confirmation Modal */}
      <GlassModal
        isOpen={Boolean(cardToDelete)}
        onClose={() => setCardToDelete(null)}
        title={t('deleteCard')}
      >
        <div className="space-y-4">
          <p className="text-xs text-neutral-300">{t('deleteCardConfirm')}</p>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setCardToDelete(null)}
              className="px-4 py-2 rounded-xl glass-button-secondary text-xs"
            >
              {t('cancel')}
            </button>
            <button
              type="button"
              onClick={handleDeleteCardConfirm}
              className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition-all cursor-pointer"
            >
              {t('deleteCard')}
            </button>
          </div>
        </div>
      </GlassModal>
    </div>
  );
}
