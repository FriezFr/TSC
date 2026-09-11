'use client';

import React, { useState } from 'react';
import { useApp } from '@/lib/context';
import { GlassCard } from '@/components/ui/GlassCard';
import { FileText, Plus, Trash2, Pin, Tag } from 'lucide-react';

export default function QuickNotesPage() {
  const { notes, addNote, togglePinNote, deleteNote } = useApp();

  const [content, setContent] = useState('');
  const [tagInput, setTagInput] = useState('');
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

  const allTags = Array.from(new Set(notes.flatMap((n) => n.tags || [])));

  const filteredNotes = notes
    .filter((n) => {
      if (selectedTag === 'all') return true;
      return n.tags?.includes(selectedTag);
    })
    .sort((a, b) => {
      if (a.is_pinned && !b.is_pinned) return -1;
      if (!a.is_pinned && b.is_pinned) return 1;
      return (b.created_at || '').localeCompare(a.created_at || '');
    });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">
          Quick Notes
        </h1>
        <p className="text-xs text-neutral-400 mt-1">
          Store formulas, rules, and notes forwarded from Telegram.
        </p>
      </div>

      {/* Add Box */}
      <GlassCard className="p-5">
        <form onSubmit={handleAddNote} className="space-y-3">
          <textarea
            rows={3}
            required
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full glass-input px-3 py-2 rounded-xl text-xs resize-none"
          />

          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Tag className="w-3.5 h-3.5 text-neutral-500" />
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                className="glass-input px-3 py-1.5 rounded-lg text-xs flex-1 sm:w-48"
              />
            </div>

            <button
              type="submit"
              className="w-full sm:w-auto px-4 py-2 rounded-xl glass-button-primary text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Save Note</span>
            </button>
          </div>
        </form>
      </GlassCard>

      {/* Filter Tags */}
      {allTags.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <button
            onClick={() => setSelectedTag('all')}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
              selectedTag === 'all'
                ? 'bg-white text-black font-bold'
                : 'bg-[#111111] text-neutral-400 hover:text-white'
            }`}
          >
            All ({notes.length})
          </button>
          {allTags.map((tag) => (
            <button
              key={tag}
              onClick={() => setSelectedTag(tag)}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                selectedTag === tag
                  ? 'bg-white text-black font-bold'
                  : 'bg-[#111111] text-neutral-400 hover:text-white'
              }`}
            >
              #{tag}
            </button>
          ))}
        </div>
      )}

      {/* Notes Grid */}
      {filteredNotes.length === 0 ? (
        <GlassCard className="p-12 text-center text-neutral-500 space-y-2">
          <FileText className="w-8 h-8 mx-auto text-neutral-600" />
          <p className="text-sm font-semibold text-neutral-300">No notes saved</p>
          <p className="text-xs">Type a note above or send a message to your Telegram bot.</p>
        </GlassCard>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredNotes.map((note) => (
            <GlassCard key={note.id} className="p-4 flex flex-col justify-between group">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex flex-wrap gap-1">
                    {note.tags?.map((t) => (
                      <span
                        key={t}
                        className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/5 text-neutral-400 border border-white/10"
                      >
                        #{t}
                      </span>
                    ))}
                  </div>

                  <button
                    onClick={() => togglePinNote(note.id)}
                    className={`p-1 cursor-pointer ${
                      note.is_pinned ? 'text-white' : 'text-neutral-600 opacity-0 group-hover:opacity-100'
                    }`}
                  >
                    <Pin className="w-3.5 h-3.5" />
                  </button>
                </div>

                <p className="text-xs text-neutral-200 whitespace-pre-wrap leading-relaxed">
                  {note.content}
                </p>
              </div>

              <div className="mt-4 pt-2 border-t border-white/5 flex items-center justify-between text-[10px] text-neutral-500 font-mono">
                <span>{note.created_at || 'Today'}</span>
                <button
                  onClick={() => deleteNote(note.id)}
                  className="opacity-0 group-hover:opacity-100 p-1 text-neutral-500 hover:text-red-400 cursor-pointer"
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
