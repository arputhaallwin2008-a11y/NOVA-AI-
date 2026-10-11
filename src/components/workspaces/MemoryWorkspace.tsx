import React, { useState, useEffect } from 'react';
import {
  Brain,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  Info,
  Sparkles,
} from 'lucide-react';
import { UserMemory } from '../../types.ts';
import { api } from '../../services/api.ts';

export const MemoryWorkspace: React.FC = () => {
  const [memories, setMemories] = useState<UserMemory[]>([]);
  const [newContent, setNewContent] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadMemories();
  }, []);

  const loadMemories = async () => {
    try {
      const res = await api.getMemories();
      setMemories(res.memories);
    } catch {
      setError('Failed to load memories.');
    }
  };

  const handleAdd = async () => {
    if (!newContent.trim() || isLoading) return;
    setIsLoading(true);
    try {
      const res = await api.addMemory(newContent.trim());
      setMemories([res.memory, ...memories]);
      setNewContent('');
    } catch (err: any) {
      setError(err.message || 'Failed to save memory.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartEdit = (m: UserMemory) => {
    setEditingId(m.id);
    setEditContent(m.memory_content);
  };

  const handleSaveEdit = async (id: string) => {
    if (!editContent.trim()) return;
    try {
      const res = await api.updateMemory(id, editContent.trim());
      setMemories(memories.map((m) => (m.id === id ? res.memory : m)));
      setEditingId(null);
    } catch {
      setError('Failed to update memory.');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.deleteMemory(id);
      setMemories(memories.filter((m) => m.id !== id));
    } catch {
      setError('Failed to delete memory.');
    }
  };

  const handleClearAll = async () => {
    if (!confirm('Are you sure you want to clear all stored memories?')) return;
    try {
      await api.clearMemories();
      setMemories([]);
    } catch {
      setError('Failed to clear memories.');
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto w-full">
      {/* Header */}
      <div className="mb-6">
        <div className="inline-flex items-center gap-2 rounded-full border border-violet-500/30 bg-violet-950/40 px-3 py-1 text-xs font-semibold text-violet-300 mb-2">
          <Brain className="h-3.5 w-3.5 text-violet-400" />
          <span>Transparent Personal Memory</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
          NOVA Memory Hub
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Give NOVA long-term memory across chats. Memories guide NOVA to adapt to your coding style, workflow, and goals.
        </p>
      </div>

      {/* Info notice about transparency */}
      <div className="mb-6 flex items-start gap-3 rounded-2xl border border-indigo-500/30 bg-indigo-950/20 p-4 text-xs text-indigo-200">
        <Info className="h-5 w-5 text-indigo-400 flex-shrink-0 mt-0.5" />
        <div className="space-y-1">
          <span className="font-semibold text-indigo-300">
            How Personal Memory works
          </span>
          <p className="text-slate-300 leading-relaxed">
            Every memory listed below is automatically provided to NOVA as context during chat conversations. You have 100% control: you can inspect, edit, or delete any memory at any time.
          </p>
        </div>
      </div>

      {/* Add Memory Card */}
      <div className="mb-6 rounded-2xl border border-slate-700/80 bg-[#111827]/80 p-4 shadow-xl backdrop-blur-xl">
        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
          Teach NOVA a New Memory
        </label>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            placeholder="e.g., I write backend code in TypeScript with Fastify, preferring functional programming..."
            className="flex-1 rounded-xl border border-slate-700 bg-slate-900/90 py-2.5 px-3.5 text-sm text-slate-100 placeholder-slate-500 focus:border-violet-500 focus:outline-none"
          />
          <button
            onClick={handleAdd}
            disabled={!newContent.trim() || isLoading}
            className={`flex items-center justify-center gap-1.5 rounded-xl px-4 py-2.5 text-xs sm:text-sm font-semibold transition-all ${
              !newContent.trim() || isLoading
                ? 'bg-slate-800 text-slate-500'
                : 'bg-gradient-to-tr from-violet-600 to-indigo-500 text-white shadow-md shadow-violet-500/20 hover:scale-102'
            }`}
          >
            <Plus className="h-4 w-4" />
            <span>Add Memory</span>
          </button>
        </div>
      </div>

      {/* Memories List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between pb-1">
          <h2 className="text-sm font-bold text-slate-300">
            Active Memories ({memories.length})
          </h2>
          {memories.length > 0 && (
            <button
              onClick={handleClearAll}
              className="text-xs text-red-400 hover:text-red-300 transition-colors"
            >
              Clear All Memories
            </button>
          )}
        </div>

        {memories.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-900/40 p-10 text-center text-slate-500">
            <Brain className="h-10 w-10 mx-auto mb-2 opacity-30 text-violet-400" />
            <p className="text-sm">No personal memories stored yet.</p>
            <p className="text-xs text-slate-600 mt-1">
              Add your tech preferences, communication style, or recurring projects above.
            </p>
          </div>
        ) : (
          memories.map((m) => (
            <div
              key={m.id}
              className="group flex items-center justify-between gap-3 rounded-xl border border-slate-800 bg-[#111827] p-3.5 shadow-sm transition-all hover:border-violet-500/40"
            >
              {editingId === m.id ? (
                <div className="flex-1 flex items-center gap-2">
                  <input
                    type="text"
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    className="flex-1 rounded-lg border border-violet-500 bg-slate-900 px-3 py-1.5 text-xs text-white focus:outline-none"
                    autoFocus
                  />
                  <button
                    onClick={() => handleSaveEdit(m.id)}
                    className="rounded p-1 text-emerald-400 hover:bg-emerald-950/40"
                  >
                    <Check className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setEditingId(null)}
                    className="rounded p-1 text-slate-400 hover:bg-slate-800"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex items-start gap-2.5">
                    <Sparkles className="h-4 w-4 text-violet-400 flex-shrink-0 mt-0.5" />
                    <span className="text-xs sm:text-sm text-slate-200 leading-relaxed">
                      {m.memory_content}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 opacity-80 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleStartEdit(m)}
                      className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                      title="Edit memory"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(m.id)}
                      className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-red-400"
                      title="Delete memory"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
