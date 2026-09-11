'use client';

import React, { useState } from 'react';
import { useApp } from '@/lib/context';
import { GlassCard } from '@/components/ui/GlassCard';
import { FileText, Plus, Trash2, Pin, Tag, Sparkles } from 'lucide-react';

export default function QuickNotesPage() {
  const { notes, addNote, togglePinNote, deleteNote } = useApp();

  const [content, setContent] = useState('');
  const [tagInput, setTagInput] = useState('Study');
  const [selectedTag, setSelectedTag] = useState<string>('all');

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    const tags = tagInput
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    await addNote(content.trim(), tags.length > 0 ? tags : ['Study']);
    setContent('');
  };

  // Collect unique tags
  const allTags = Array.from(
    new Set(notes.flatMap((n) => n.tags || []))
  );

  const filteredNotes = notes
    .filter((n) => {
      if (selectedTag === 'all') return true;
      return n.tags?.includes(selectedTag);
    })
    .sort((a, b) => {
      // Pinned first, then newest
      if (a.is_pinned && !b.is_pinned) return -1;
      if (!a.is_pinned && b.is_pinned) return 1;
      return (b.created_at || '').localeCompare(a.created_at || '');
    });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 shadow-[0_0_15px_rgba(0,240,255,0.15)]">
              <FileText className="w-5 h-5" />
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight">
              Quick Study Notes
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Capture formulas, teacher tips, and instant voice memos forwarded from Telegram.
          </p>
        </div>
      </div>

      {/* Add Note Quick Box */}
      <GlassCard glow className="p-6">
        <form onSubmit={handleAddNote} className="space-y-3">
          <textarea
            rows={3}
            required
            placeholder="Type your quick note, physics rule, or Arabic grammatical exception..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full glass-input px-4 py-3 rounded-2xl text-sm resize-none"
          />

          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Tag className="w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Tags (e.g. Physics, Law, Exam)"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                className="glass-input px-3 py-1.5 rounded-xl text-xs flex-1 sm:w-56"
              />
            </div>

            <button
              type="submit"
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl glass-button-primary text-xs font-bold flex items-center justify-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Save Note</span>
            </button>
          </div>
        </form>
      </GlassCard>

      {/* Tags Filter */}
      {allTags.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <button
            onClick={() => setSelectedTag('all')}
            className={`px-3 py-1 rounded-xl text-xs font-medium transition-all ${
              selectedTag === 'all'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/30'
                : 'bg-white/5 text-slate-400 hover:text-white'
            }`}
          >
            All Notes ({notes.length})
          </button>
          {allTags.map((tag) => (
            <button
              key={tag}
              onClick={() => setSelectedTag(tag)}
              className={`px-3 py-1 rounded-xl text-xs font-medium transition-all ${
                selectedTag === tag
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/30'
                  : 'bg-white/5 text-slate-400 hover:text-white'
              }`}
            >
              #{tag}
            </button>
          ))}
        </div>
      )}

      {/* Notes Grid */}
      {filteredNotes.length === 0 ? (
        <GlassCard className="p-12 text-center text-slate-400 space-y-2">
          <p className="text-sm font-semibold text-slate-300">No notes found</p>
          <p className="text-xs text-slate-500">
            Write down a quick thought above or send a message to your Telegram memory bot!
          </p>
        </GlassCard>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredNotes.map((note) => (
            <GlassCard
              key={note.id}
              interactive
              className={`p-5 flex flex-col justify-between group transition-all ${
                note.is_pinned
                  ? 'border-cyan-400/40 shadow-[0_0_25px_rgba(0,240,255,0.12)]'
                  : ''
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex flex-wrap gap-1.5">
                    {note.tags?.map((t) => (
                      <span
                        key={t}
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-md ${
                          t.toLowerCase() === 'telegram'
                            ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                            : 'bg-white/5 text-cyan-400 border border-white/5'
                        }`}
                      >
                        #{t}
                      </span>
                    ))}
                  </div>

                  <button
                    onClick={() => togglePinNote(note.id)}
                    className={`p-1 rounded-lg transition-all ${
                      note.is_pinned
                        ? 'text-cyan-400 hover:text-cyan-300'
                        : 'text-slate-500 hover:text-slate-300 opacity-0 group-hover:opacity-100'
                    }`}
                    title={note.is_pinned ? 'Unpin note' : 'Pin to top'}
                  >
                    <Pin className={`w-3.5 h-3.5 ${note.is_pinned ? 'fill-current' : ''}`} />
                  </button>
                </div>

                <p className="text-xs sm:text-sm text-slate-200 whitespace-pre-wrap leading-relaxed">
                  {note.content}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-[10px] text-slate-400">
                <span className="font-mono">{note.created_at || 'Today'}</span>

                <button
                  onClick={() => deleteNote(note.id)}
                  className="opacity-0 group-hover:opacity-100 p-1 rounded-md text-slate-400 hover:text-rose-400 transition-all"
                  title="Delete note"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </GlassCard>
          ))}
        </div>
      )}
    </div>
  );
}
