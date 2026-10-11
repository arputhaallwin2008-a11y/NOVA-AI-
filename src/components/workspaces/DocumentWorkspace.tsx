import React, { useState } from 'react';
import {
  FileText,
  Upload,
  MessageSquare,
  FileCode,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sparkles,
} from 'lucide-react';
import { api } from '../../services/api.ts';
import { FileAttachment } from '../../types.ts';

interface DocumentWorkspaceProps {
  onStartDocChat: (attachment: FileAttachment, promptHint: string) => void;
}

export const DocumentWorkspace: React.FC<DocumentWorkspaceProps> = ({ onStartDocChat }) => {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [parsedDoc, setParsedDoc] = useState<{
    id: string;
    name: string;
    mimeType: string;
    size: number;
    previewText: string;
    summary: string;
    base64Data?: string;
  } | null>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setError(null);

    try {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const base64Data = (reader.result as string).split(',')[1];
          const res = await api.uploadDocument({
            name: file.name,
            mimeType: file.type || 'text/plain',
            base64Data,
          });
          setParsedDoc(res.document);
        } catch (err: any) {
          setError(err.message || 'Failed to process document');
        } finally {
          setIsUploading(false);
        }
      };
      reader.readAsDataURL(file);
    } catch {
      setIsUploading(false);
      setError('Could not read file.');
    }
  };

  const handleAsk = () => {
    if (!parsedDoc) return;
    onStartDocChat(
      {
        name: parsedDoc.name,
        mimeType: parsedDoc.mimeType,
        size: parsedDoc.size,
        previewText: parsedDoc.previewText,
        data: parsedDoc.base64Data,
      },
      `Please provide an executive analysis and answer questions about "${parsedDoc.name}".`
    );
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto w-full">
      {/* Header */}
      <div className="mb-6">
        <div className="inline-flex items-center gap-2 rounded-full border border-violet-500/30 bg-violet-950/40 px-3 py-1 text-xs font-semibold text-violet-300 mb-2">
          <FileText className="h-3.5 w-3.5 text-violet-400" />
          <span>Document Intelligence</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
          Document Assistant
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Upload PDF documents, Markdown, source code, or text files to extract knowledge, inspect summaries, and ask deep questions.
        </p>
      </div>

      {/* Upload Zone */}
      <div className="mb-8">
        <label className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-700 bg-[#111827]/70 p-8 text-center cursor-pointer hover:border-violet-500/60 hover:bg-[#141b2f] transition-all group">
          <input
            type="file"
            accept=".pdf,.txt,.md,.json,.csv"
            onChange={handleFileUpload}
            disabled={isUploading}
            className="hidden"
          />
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-950/50 text-violet-400 group-hover:scale-110 group-hover:bg-violet-600 group-hover:text-white transition-all ring-1 ring-violet-500/30 mb-3">
            {isUploading ? (
              <Loader2 className="h-7 w-7 animate-spin text-violet-400" />
            ) : (
              <Upload className="h-7 w-7" />
            )}
          </div>
          <span className="text-base font-semibold text-slate-200">
            {isUploading ? 'Analyzing Document Content...' : 'Click to select or drop a document'}
          </span>
          <span className="text-xs text-slate-400 mt-1">
            Supported formats: PDF, Markdown (.md), Plain Text (.txt), JSON, CSV (Max 10MB)
          </span>
        </label>
      </div>

      {error && (
        <div className="mb-6 flex items-center gap-2 rounded-xl border border-red-500/40 bg-red-950/40 p-3 text-xs text-red-300">
          <AlertCircle className="h-4 w-4 text-red-400 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Extracted Document Overview */}
      {parsedDoc && (
        <div className="rounded-2xl border border-slate-700/80 bg-[#111827]/90 p-5 sm:p-6 shadow-2xl backdrop-blur-xl space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-600/20 text-violet-400 ring-1 ring-violet-500/30">
                <FileCode className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">{parsedDoc.name}</h3>
                <span className="text-xs text-slate-400">
                  {Math.round(parsedDoc.size / 1024)} KB • {parsedDoc.mimeType}
                </span>
              </div>
            </div>

            <button
              onClick={handleAsk}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-500 px-4 py-2 text-xs sm:text-sm font-semibold text-white shadow-md shadow-violet-500/30 hover:scale-105 transition-all"
            >
              <MessageSquare className="h-4 w-4" />
              <span>Ask Questions in Chat</span>
            </button>
          </div>

          {/* AI Executive Summary */}
          {parsedDoc.summary && (
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-violet-300 block mb-2">
                Executive Synthesis
              </span>
              <div className="rounded-xl border border-violet-900/40 bg-violet-950/20 p-4 text-sm text-slate-200 leading-relaxed">
                {parsedDoc.summary}
              </div>
            </div>
          )}

          {/* Extracted Text Snippet */}
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-2">
              Extracted Content Preview
            </span>
            <div className="max-h-64 overflow-y-auto rounded-xl border border-slate-800 bg-slate-900/90 p-4 font-mono text-xs text-slate-300 whitespace-pre-wrap leading-relaxed">
              {parsedDoc.previewText || 'No printable text found in preview.'}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
