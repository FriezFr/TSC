'use client';

import React from 'react';
import { GlassCard } from '@/components/ui/GlassCard';
import { AiActivityItem } from '@/lib/types';
import {
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Clock,
  Trash2,
  Calendar,
  Send,
  Zap,
} from 'lucide-react';

interface AiActivityFeedProps {
  activities: AiActivityItem[];
  onUndo: (id: string) => Promise<any> | void;
  onClearHistory?: () => void;
}

export default function AiActivityFeed({
  activities,
  onUndo,
  onClearHistory,
}: AiActivityFeedProps) {
  const getSourceBadge = (source: string) => {
    switch (source) {
      case 'whatsapp':
        return (
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 font-mono">
            WhatsApp
          </span>
        );
      case 'telegram':
        return (
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-300 border border-sky-500/20 font-mono">
            Telegram
          </span>
        );
      case 'web_importer':
        return (
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/20 font-mono">
            Importer
          </span>
        );
      default:
        return (
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-300 border border-blue-500/20 font-mono">
            AI Assistant
          </span>
        );
    }
  };

  const getActionIcon = (type: string, isUndone?: boolean) => {
    if (isUndone) {
      return <RotateCcw className="w-3.5 h-3.5 text-neutral-500" />;
    }
    switch (type) {
      case 'CONFLICT_DETECTED':
        return <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />;
      case 'CANCEL_LESSON':
        return <Trash2 className="w-3.5 h-3.5 text-red-400" />;
      case 'UPDATE_LESSON':
        return <Clock className="w-3.5 h-3.5 text-blue-400" />;
      case 'DAILY_PLAN':
        return <Sparkles className="w-3.5 h-3.5 text-purple-400" />;
      default:
        return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />;
    }
  };

  return (
    <GlassCard className="p-5 space-y-3">
      <div className="flex items-center justify-between border-b border-white/5 pb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-blue-400" />
          <h2 className="text-sm font-bold text-white tracking-tight">
            سجل نشاط الذكاء الاصطناعي (AI Activity & Undo)
          </h2>
        </div>

        {activities.length > 0 && onClearHistory && (
          <button
            onClick={onClearHistory}
            className="text-[11px] text-neutral-500 hover:text-neutral-300 cursor-pointer"
          >
            مسح السجل
          </button>
        )}
      </div>

      {activities.length === 0 ? (
        <div className="py-6 text-center text-neutral-500 text-xs space-y-1">
          <p className="font-semibold text-neutral-400">لا توجد تحديثات تلقائية حديثة</p>
          <p className="text-[11px]">
            أي رسالة ترسلها عبر واتساب أو تيليجرام لتسجيل واجب، تعديل حصة، أو تنظيم جدول ستظهر هنا مع إمكانية التراجع الفوري.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {activities.slice(0, 5).map((item) => (
            <div
              key={item.id}
              className={`p-3 rounded-xl border flex items-start justify-between gap-3 transition-all ${
                item.is_undone
                  ? 'bg-[#0f0f0f] border-white/5 opacity-50'
                  : item.action_type === 'CONFLICT_DETECTED'
                  ? 'bg-amber-500/5 border-amber-500/20 text-amber-200'
                  : 'bg-[#111111] border-white/5'
              }`}
            >
              <div className="flex items-start gap-2.5 min-w-0">
                <div className="mt-0.5 shrink-0">{getActionIcon(item.action_type, item.is_undone)}</div>

                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4
                      className={`text-xs font-bold truncate ${
                        item.is_undone ? 'line-through text-neutral-500' : 'text-white'
                      }`}
                    >
                      {item.title}
                    </h4>
                    {getSourceBadge(item.source)}
                  </div>

                  {item.description && (
                    <p className="text-[11px] text-neutral-400 mt-0.5 leading-relaxed">
                      {item.description}
                    </p>
                  )}

                  <span className="text-[10px] text-neutral-500 font-mono mt-1 block">
                    {item.created_at ? new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'الآن'}
                  </span>
                </div>
              </div>

              {/* 1-Click Undo Button */}
              {!item.is_undone && item.target_id && (
                <button
                  onClick={() => onUndo(item.id)}
                  className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-neutral-300 hover:text-white text-[11px] font-medium border border-white/10 shrink-0 flex items-center gap-1 transition-all cursor-pointer"
                  title="تراجع عن هذا التعديل"
                >
                  <RotateCcw className="w-3 h-3 text-neutral-400" />
                  <span>تراجع</span>
                </button>
              )}

              {item.is_undone && (
                <span className="text-[10px] text-neutral-500 font-mono shrink-0">
                  تم التراجع ✓
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </GlassCard>
  );
}
