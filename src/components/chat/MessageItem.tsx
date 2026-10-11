import React, { useState, useRef } from 'react';
import {
  Sparkles,
  User as UserIcon,
  Copy,
  Check,
  Star,
  Volume2,
  VolumeX,
  RotateCcw,
  Globe,
  ExternalLink,
  FileText,
} from 'lucide-react';
import { Message } from '../../types.ts';
import { MarkdownRenderer } from './MarkdownRenderer.tsx';
import { api } from '../../services/api.ts';

interface MessageItemProps {
  message: Message;
  isLatest: boolean;
  onStarToggle: (messageId: string, currentStarred: boolean) => void;
  onRegenerate?: () => void;
  voiceName?: string;
}

export const MessageItem: React.FC<MessageItemProps> = ({
  message,
  isLatest,
  onStarToggle,
  onRegenerate,
  voiceName = 'Zephyr',
}) => {
  const [copied, setCopied] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const isAssistant = message.role === 'assistant';

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleToggleVoice = async () => {
    if (isPlayingAudio) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      setIsPlayingAudio(false);
      return;
    }

    try {
      setIsPlayingAudio(true);
      // Attempt server TTS
      try {
        const res = await api.textToSpeech({
          text: message.content.slice(0, 800),
          voice: voiceName,
        });

        const audio = new Audio(res.audioUrl);
        audioRef.current = audio;
        audio.onended = () => setIsPlayingAudio(false);
        audio.onerror = () => {
          fallbackBrowserSpeech(message.content);
        };
        await audio.play();
      } catch (serverTtsErr) {
        console.warn('Server TTS failed, falling back to browser speech:', serverTtsErr);
        fallbackBrowserSpeech(message.content);
      }
    } catch {
      setIsPlayingAudio(false);
    }
  };

  const fallbackBrowserSpeech = (text: string) => {
    if (!('speechSynthesis' in window)) {
      setIsPlayingAudio(false);
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text.slice(0, 1000));
    utterance.rate = 1.0;
    utterance.onend = () => setIsPlayingAudio(false);
    utterance.onerror = () => setIsPlayingAudio(false);
    window.speechSynthesis.speak(utterance);
  };

  return (
    <div
      className={`group relative flex w-full gap-4 px-4 py-5 transition-colors sm:px-6 md:px-8 ${
        isAssistant
          ? 'bg-gradient-to-b from-[#111827]/40 to-[#0b0f19]/60'
          : 'bg-transparent'
      }`}
    >
      {/* Avatar */}
      <div className="flex-shrink-0 pt-0.5">
        {isAssistant ? (
          <div className="relative flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-500 shadow-md shadow-violet-500/20 ring-1 ring-violet-400/30">
            <Sparkles className="h-4 w-4 text-white" />
            {message.status === 'streaming' && (
              <span className="absolute -bottom-0.5 -right-0.5 flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-75"></span>
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-cyan-500"></span>
              </span>
            )}
          </div>
        ) : (
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-800 text-slate-300 ring-1 ring-slate-700">
            <UserIcon className="h-4 w-4" />
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 min-w-0 space-y-2">
        {/* Header line */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold tracking-wide text-slate-300">
            {isAssistant ? 'NOVA' : 'You'}
          </span>
          {isAssistant && message.model_name && (
            <span className="rounded-full bg-violet-950/70 border border-violet-800/40 px-2 py-0.5 text-[10px] font-medium text-violet-300">
              {message.model_name}
            </span>
          )}
          <span className="text-[11px] text-slate-500">
            {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>

        {/* Uploaded Files preview if any */}
        {message.file_attachments && message.file_attachments.length > 0 && (
          <div className="flex flex-wrap gap-2 py-1">
            {message.file_attachments.map((file, i) => (
              <div
                key={i}
                className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800/90 px-3 py-1.5 text-xs text-slate-200 shadow-sm"
              >
                <FileText className="h-3.5 w-3.5 text-violet-400" />
                <span className="font-medium truncate max-w-[200px]">{file.name}</span>
                {file.size && (
                  <span className="text-[10px] text-slate-400">({Math.round(file.size / 1024)} KB)</span>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Message body */}
        <div className="text-slate-100">
          <MarkdownRenderer content={message.content} />
          {message.status === 'streaming' && (
            <span className="inline-block h-4 w-2 animate-pulse bg-violet-400 ml-1 rounded-sm align-middle" />
          )}
        </div>

        {/* Grounding Web Search Sources */}
        {message.grounding_data && message.grounding_data.length > 0 && (
          <div className="mt-4 rounded-xl border border-slate-800 bg-[#0c1220]/80 p-3">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 mb-2">
              <Globe className="h-3.5 w-3.5 text-cyan-400" />
              <span>Web Sources Referenced</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {message.grounding_data.map((src, idx) => (
                <a
                  key={idx}
                  href={src.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between gap-2 rounded-lg border border-slate-800/90 bg-slate-900/60 px-3 py-2 text-xs text-slate-300 hover:border-violet-500/50 hover:bg-slate-800 transition-colors group/link"
                >
                  <span className="truncate font-medium group-hover/link:text-cyan-300">
                    {src.title || src.url}
                  </span>
                  <ExternalLink className="h-3 w-3 flex-shrink-0 text-slate-500 group-hover/link:text-cyan-400" />
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Action Bar */}
        {isAssistant && message.status !== 'streaming' && (
          <div className="flex items-center gap-1 pt-2 opacity-90 transition-opacity sm:opacity-70 sm:group-hover:opacity-100">
            {/* Copy button */}
            <button
              onClick={handleCopy}
              className="flex items-center gap-1 rounded-md p-1.5 text-xs text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors"
              title="Copy response"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
              <span className="hidden sm:inline">{copied ? 'Copied' : 'Copy'}</span>
            </button>

            {/* Star button */}
            <button
              onClick={() => onStarToggle(message.id, Boolean(message.is_starred))}
              className={`flex items-center gap-1 rounded-md p-1.5 text-xs transition-colors ${
                message.is_starred
                  ? 'text-amber-400 hover:bg-amber-950/40'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-amber-300'
              }`}
              title={message.is_starred ? 'Unstar message' : 'Star message'}
            >
              <Star
                className={`h-3.5 w-3.5 ${message.is_starred ? 'fill-amber-400' : ''}`}
              />
              <span className="hidden sm:inline">
                {message.is_starred ? 'Starred' : 'Star'}
              </span>
            </button>

            {/* Voice Read Aloud button */}
            <button
              onClick={handleToggleVoice}
              className={`flex items-center gap-1 rounded-md p-1.5 text-xs transition-colors ${
                isPlayingAudio
                  ? 'text-cyan-400 hover:bg-cyan-950/40'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-cyan-300'
              }`}
              title={isPlayingAudio ? 'Stop speaking' : 'Read aloud'}
            >
              {isPlayingAudio ? (
                <>
                  <VolumeX className="h-3.5 w-3.5 animate-pulse" />
                  <span className="hidden sm:inline">Stop</span>
                </>
              ) : (
                <>
                  <Volume2 className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Listen</span>
                </>
              )}
            </button>

            {/* Regenerate if latest */}
            {isLatest && onRegenerate && (
              <button
                onClick={onRegenerate}
                className="flex items-center gap-1 rounded-md p-1.5 text-xs text-slate-400 hover:bg-slate-800 hover:text-violet-300 transition-colors ml-auto sm:ml-2"
                title="Regenerate response"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Regenerate</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
