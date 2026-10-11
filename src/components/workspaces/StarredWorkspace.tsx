import React, { useState, useEffect } from 'react';
import {
  Star,
  Copy,
  Check,
  ExternalLink,
  Trash2,
  Sparkles,
} from 'lucide-react';
import { StarredItem } from '../../types.ts';
import { api } from '../../services/api.ts';
import { MarkdownRenderer } from '../chat/MarkdownRenderer.tsx';

interface StarredWorkspaceProps {
  onOpenConversation: (conversationId: string) => void;
}

export const StarredWorkspace: React.FC<StarredWorkspaceProps> = ({ onOpenConversation }) => {
  const [items, setItems] = useState<StarredItem[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    loadStarred();
  }, []);

  const loadStarred = async () => {
    try {
      const res = await api.getStarred();
      setItems(res.starredItems);
    } catch (err) {
      console.error('Failed to load starred items:', err);
    }
  };

  const handleCopy = (item: StarredItem) => {
    navigator.clipboard.writeText(item.content);
    setCopiedId(item.message_id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleRemove = async (messageId: string) => {
    try {
      await api.unstarMessage(messageId);
      setItems(items.filter((item) => item.message_id !== messageId));
    } catch (err) {
      console.error('Failed to remove star:', err);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto w-full">
      {/* Header */}
      <div className="mb-6">
        <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-950/40 px-3 py-1 text-xs font-semibold text-amber-300 mb-2">
          <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
          <span>Saved Knowledge</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
          Starred Responses
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Your curated repository of high-value insights, code snippets, and explanations.
        </p>
      </div>

      {items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-900/40 p-12 text-center text-slate-500">
          <Star className="h-10 w-10 mx-auto mb-3 opacity-30 text-amber-400" />
          <p className="text-sm">No starred messages yet.</p>
          <p className="text-xs text-slate-600 mt-1">
            Click the star icon on any AI assistant response during a conversation to save it here.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((item) => (
            <div
              key={item.star_id}
              className="rounded-2xl border border-slate-800 bg-[#111827]/90 p-5 shadow-lg backdrop-blur-xl transition-all hover:border-violet-500/40"
            >
              {/* Header info */}
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-3 mb-3 text-xs text-slate-400">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-violet-400" />
                  <span className="font-semibold text-slate-200">
                    From: {item.conversation_title}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onOpenConversation(item.conversation_id)}
                    className="flex items-center gap-1 text-xs text-violet-400 hover:text-violet-300 transition-colors"
                  >
                    <span>Open Chat</span>
                    <ExternalLink className="h-3 w-3" />
                  </button>
                  <button
                    onClick={() => handleRemove(item.message_id)}
                    className="rounded p-1 text-slate-500 hover:text-red-400 transition-colors"
                    title="Remove from starred"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* Message Content */}
              <div className="max-h-72 overflow-y-auto pr-1">
                <MarkdownRenderer content={item.content} />
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between border-t border-slate-800/80 pt-3 mt-3 text-xs text-slate-500">
                <span>
                  Starred on {new Date(item.starred_at).toLocaleDateString()}
                </span>
                <button
                  onClick={() => handleCopy(item)}
                  className="flex items-center gap-1 rounded-lg px-2 py-1 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
                >
                  {copiedId === item.message_id ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-400" />
                      <span className="text-emerald-400">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
