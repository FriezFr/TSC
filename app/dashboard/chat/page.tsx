'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '@/lib/context';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassModal } from '@/components/ui/GlassModal';
import {
  Send,
  Bot,
  User as UserIcon,
  RefreshCw,
  Trash2,
  FileText,
  Image as ImageIcon,
  Mic,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Sparkles,
} from 'lucide-react';
import Link from 'next/link';

// Component to clean up LaTeX math and markdown symbols for natural display
function FormattedMessage({ content }: { content: string }) {
  // Clean raw LaTeX dollar signs and brackets
  const cleanContent = content
    .replace(/\$\$([\s\S]*?)\$\$/g, '$1')
    .replace(/\$([^\$\n]+)\$/g, '$1')
    .replace(/\\\(([\s\S]*?)\\\)/g, '$1')
    .replace(/\\\[([\s\S]*?)\\\]/g, '$1')
    .replace(/\\times/g, '×')
    .replace(/\\div/g, '÷')
    .replace(/\\le/g, '≤')
    .replace(/\\ge/g, '≥');

  const lines = cleanContent.split('\n');

  return (
    <div className="space-y-1 leading-relaxed text-xs" dir="auto">
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        if (!trimmed) {
          return <div key={idx} className="h-1" />;
        }

        // Parse bolding **text**
        const parts = line.split(/(\*\*.*?\*\*)/g);

        const renderedLine = parts.map((part, pIdx) => {
          if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
            const boldText = part.slice(2, -2);
            return (
              <strong key={pIdx} className="font-bold text-white tracking-wide">
                {boldText}
              </strong>
            );
          }
          // Remove stray asterisks from words
          const cleanPart = part.replace(/(^|\s)\*([^\*]+)\*(\s|$)/g, '$1$2$3');
          return <span key={pIdx}>{cleanPart}</span>;
        });

        // Bullet points
        if (trimmed.startsWith('•') || trimmed.startsWith('- ') || /^\d+\.\s/.test(trimmed)) {
          return (
            <div key={idx} className="flex items-start gap-1.5 my-0.5">
              <span className="shrink-0 text-blue-400 font-bold">•</span>
              <div className="flex-1">{renderedLine}</div>
            </div>
          );
        }

        return <div key={idx}>{renderedLine}</div>;
      })}
    </div>
  );
}

export default function ChatDashboardPage() {
  const {
    chatMessages,
    sendChatMessage,
    refreshChatMessages,
    clearChatMessages,
    telegramLinked,
    t,
  } = useApp();

  const [inputMessage, setInputMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [filter, setFilter] = useState<'all' | 'telegram' | 'web'>('all');
  const [isClearModalOpen, setIsClearModalOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, isSending]);

  // Periodic sync from Telegram every 6 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      refreshChatMessages();
    }, 6000);
    return () => clearInterval(interval);
  }, [refreshChatMessages]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshChatMessages();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || isSending) return;

    const msg = inputMessage.trim();
    setInputMessage('');
    setIsSending(true);
    try {
      await sendChatMessage(msg);
    } finally {
      setIsSending(false);
    }
  };

  const handleClearHistory = async () => {
    await clearChatMessages();
    setIsClearModalOpen(false);
  };

  const filteredMessages = chatMessages.filter((m) => {
    if (filter === 'all') return true;
    return m.source === filter;
  });

  return (
    <div className="flex flex-col h-[calc(100vh-8.5rem)] space-y-4">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <span>{t('chatTitle')}</span>
            <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
              Gemini 3.6 Flash
            </span>
          </h1>
          <p className="text-xs text-neutral-400 mt-0.5">
            {t('chatSubtitle')}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Quick Open Telegram Bot Button */}
          <a
            href="https://t.me/TSCTaskerBot"
            target="_blank"
            rel="noopener noreferrer"
            className="px-3.5 py-2 rounded-xl bg-sky-500/15 hover:bg-sky-500/25 border border-sky-500/30 text-sky-300 text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Open @TSCTaskerBot</span>
            <ExternalLink className="w-3 h-3 opacity-70" />
          </a>

          <button
            onClick={handleRefresh}
            className="p-2 rounded-xl glass-button-secondary text-xs flex items-center gap-1.5 cursor-pointer text-neutral-300 hover:text-white"
            title="Refresh messages"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Sync</span>
          </button>

          {chatMessages.length > 0 && (
            <button
              onClick={() => setIsClearModalOpen(true)}
              className="p-2 rounded-xl border border-red-900/30 bg-red-950/20 text-red-400 hover:bg-red-950/40 text-xs flex items-center gap-1.5 cursor-pointer transition-all"
              title={t('clearHistory')}
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{t('clearHistory')}</span>
            </button>
          )}
        </div>
      </div>

      {/* Sync Status Banner */}
      <div className="shrink-0 p-3 rounded-2xl bg-[#0d0d0d] border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          {telegramLinked ? (
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{t('telegramConnected')}</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-xs font-medium text-amber-400">
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>{t('telegramNotConnected')}</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {!telegramLinked && (
            <Link
              href="/dashboard/settings"
              className="px-3 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-semibold flex items-center gap-1 transition-all"
            >
              <span>Link Account</span>
              <ExternalLink className="w-3 h-3" />
            </Link>
          )}

          {/* Source Filter Tabs */}
          <div className="flex items-center bg-black/60 p-0.5 rounded-lg border border-white/5 text-[11px]">
            <button
              onClick={() => setFilter('all')}
              className={`px-2.5 py-1 rounded-md transition-all ${
                filter === 'all'
                  ? 'bg-white text-black font-bold'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              {t('filterAll')}
            </button>
            <button
              onClick={() => setFilter('telegram')}
              className={`px-2.5 py-1 rounded-md transition-all ${
                filter === 'telegram'
                  ? 'bg-white text-black font-bold'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              {t('filterTelegram')}
            </button>
            <button
              onClick={() => setFilter('web')}
              className={`px-2.5 py-1 rounded-md transition-all ${
                filter === 'web'
                  ? 'bg-white text-black font-bold'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              {t('filterWeb')}
            </button>
          </div>
        </div>
      </div>

      {/* Main Chat Stream Container */}
      <GlassCard className="flex-1 flex flex-col min-h-0 overflow-hidden p-0 border border-white/10 bg-black/40">
        {/* Messages Scroll Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {filteredMessages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-neutral-400">
                <Bot className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">{t('noMessagesYet')}</h3>
                <p className="text-xs text-neutral-500 mt-1 max-w-sm">
                  {t('noMessagesDesc')}
                </p>
              </div>
            </div>
          ) : (
            filteredMessages.map((msg) => {
              const isUser = msg.role === 'user';

              return (
                <div
                  key={msg.id}
                  className={`flex gap-3 max-w-3xl ${
                    isUser ? 'ml-auto flex-row-reverse' : 'mr-auto'
                  }`}
                >
                  {/* Avatar */}
                  <div
                    className={`w-7 h-7 rounded-xl shrink-0 flex items-center justify-center text-xs font-bold ${
                      isUser
                        ? 'bg-white text-black'
                        : 'bg-[#181818] text-white border border-white/10'
                    }`}
                  >
                    {isUser ? (
                      <UserIcon className="w-3.5 h-3.5" />
                    ) : (
                      <Bot className="w-3.5 h-3.5 text-blue-400" />
                    )}
                  </div>

                  {/* Message Bubble */}
                  <div
                    className={`rounded-2xl px-4 py-3 text-xs leading-relaxed space-y-1.5 max-w-[85%] sm:max-w-[75%] ${
                      isUser
                        ? 'bg-neutral-900 border border-white/15 text-white'
                        : 'bg-[#0e0e0e] border border-white/10 text-neutral-200 shadow-md'
                    }`}
                  >
                    {/* Header Info: Source & Timestamp */}
                    <div className="flex items-center gap-2 text-[10px] text-neutral-400 pb-0.5 border-b border-white/5">
                      <span className="font-semibold uppercase tracking-wider">
                        {isUser ? 'You' : 'AI Study Tutor'}
                      </span>
                      <span>•</span>
                      <span
                        className={`px-1.5 py-0.2 rounded font-mono text-[9px] ${
                          msg.source === 'telegram'
                            ? 'bg-sky-500/10 text-sky-300 border border-sky-500/20'
                            : 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
                        }`}
                      >
                        {msg.source === 'telegram' ? 'Telegram' : 'Web'}
                      </span>
                      {msg.created_at && (
                        <>
                          <span>•</span>
                          <span>
                            {new Date(msg.created_at).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </>
                      )}
                    </div>

                    {/* Media Attachment Tag */}
                    {msg.media_type && msg.media_type !== 'text' && (
                      <div className="flex items-center gap-1.5 py-1 text-neutral-400 text-[11px] font-mono">
                        {msg.media_type === 'document' && <FileText className="w-3.5 h-3.5" />}
                        {msg.media_type === 'photo' && <ImageIcon className="w-3.5 h-3.5" />}
                        {msg.media_type === 'voice' && <Mic className="w-3.5 h-3.5" />}
                        <span>{msg.media_name || msg.media_type}</span>
                      </div>
                    )}

                    {/* Clean Formatted Message Content (NO raw $ or stray *) */}
                    <FormattedMessage content={msg.content} />
                  </div>
                </div>
              );
            })
          )}

          {/* AI Thinking Animation */}
          {isSending && (
            <div className="flex gap-3 max-w-3xl mr-auto">
              <div className="w-7 h-7 rounded-xl shrink-0 flex items-center justify-center text-xs font-bold bg-[#181818] text-white border border-white/10">
                <Bot className="w-3.5 h-3.5 text-blue-400" />
              </div>
              <div className="rounded-2xl px-4 py-3 text-xs bg-[#0e0e0e] border border-white/10 text-neutral-400 flex items-center gap-2">
                <div className="flex gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce [animation-delay:-0.3s]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce [animation-delay:-0.15s]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce" />
                </div>
                <span className="text-[11px]">Thinking & generating response...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <form
          onSubmit={handleSend}
          className="p-3 bg-black/80 border-t border-white/10 flex items-center gap-2"
        >
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder={t('sendQuestionPlaceholder')}
            disabled={isSending}
            className="flex-1 glass-input px-4 py-2.5 rounded-xl text-xs bg-[#0c0c0c] text-white placeholder:text-neutral-500 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!inputMessage.trim() || isSending}
            className="px-4 py-2.5 rounded-xl glass-button-primary text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            {isSending ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Send className="w-3.5 h-3.5" />
            )}
            <span className="hidden sm:inline">{t('sendBtn')}</span>
          </button>
        </form>
      </GlassCard>

      {/* Clear History Confirmation Modal */}
      <GlassModal
        isOpen={isClearModalOpen}
        onClose={() => setIsClearModalOpen(false)}
        title={t('clearHistory')}
      >
        <div className="space-y-4">
          <p className="text-xs text-neutral-300">
            Are you sure you want to clear your conversation history? This will delete all logged
            messages on the web dashboard.
          </p>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsClearModalOpen(false)}
              className="px-4 py-2 rounded-xl glass-button-secondary text-xs"
            >
              {t('cancel')}
            </button>
            <button
              type="button"
              onClick={handleClearHistory}
              className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition-all cursor-pointer"
            >
              {t('clearHistory')}
            </button>
          </div>
        </div>
      </GlassModal>
    </div>
  );
}
