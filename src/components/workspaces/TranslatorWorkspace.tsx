import React, { useState } from 'react';
import {
  Languages,
  ArrowRightLeft,
  Copy,
  Check,
  RotateCcw,
  Volume2,
  VolumeX,
  Loader2,
  Sparkles,
} from 'lucide-react';
import { api } from '../../services/api.ts';

const LANGUAGES = [
  { code: 'auto', name: 'Auto Detect' },
  { code: 'English', name: 'English' },
  { code: 'Tamil', name: 'Tamil (தமிழ்)' },
  { code: 'Hindi', name: 'Hindi (हिन्दी)' },
  { code: 'Spanish', name: 'Spanish (Español)' },
  { code: 'French', name: 'French (Français)' },
  { code: 'German', name: 'German (Deutsch)' },
  { code: 'Japanese', name: 'Japanese (日本語)' },
  { code: 'Chinese (Simplified)', name: 'Chinese (简体中文)' },
  { code: 'Arabic', name: 'Arabic (العربية)' },
  { code: 'Russian', name: 'Russian (Русский)' },
  { code: 'Portuguese', name: 'Portuguese (Português)' },
  { code: 'Italian', name: 'Italian (Italiano)' },
  { code: 'Korean', name: 'Korean (한국어)' },
  { code: 'Telugu', name: 'Telugu (తెలుగు)' },
  { code: 'Malayalam', name: 'Malayalam (മലയാളം)' },
  { code: 'Bengali', name: 'Bengali (বাংলা)' },
];

export const TranslatorWorkspace: React.FC = () => {
  const [sourceLang, setSourceLang] = useState('auto');
  const [targetLang, setTargetLang] = useState('Tamil');
  const [inputText, setInputText] = useState('');
  const [translatedText, setTranslatedText] = useState('');
  const [detectedLang, setDetectedLang] = useState<string | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleTranslate = async () => {
    if (!inputText.trim() || isTranslating) return;
    setIsTranslating(true);
    setError(null);

    try {
      const res = await api.translate({
        text: inputText.trim(),
        sourceLang,
        targetLang,
      });

      setTranslatedText(res.translatedText);
      if (res.detectedSourceLang && sourceLang === 'auto') {
        setDetectedLang(res.detectedSourceLang);
      }
    } catch (err: any) {
      setError(err.message || 'Translation failed.');
    } finally {
      setIsTranslating(false);
    }
  };

  const handleSwap = () => {
    if (sourceLang === 'auto') {
      setSourceLang(targetLang);
      setTargetLang('English');
    } else {
      const temp = sourceLang;
      setSourceLang(targetLang);
      setTargetLang(temp);
    }
    setInputText(translatedText);
    setTranslatedText(inputText);
    setDetectedLang(null);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(translatedText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClear = () => {
    setInputText('');
    setTranslatedText('');
    setDetectedLang(null);
    setError(null);
  };

  const handleSpeech = (text: string) => {
    if (!('speechSynthesis' in window)) return;
    if (isPlayingAudio) {
      window.speechSynthesis.cancel();
      setIsPlayingAudio(false);
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.onend = () => setIsPlayingAudio(false);
    utterance.onerror = () => setIsPlayingAudio(false);
    setIsPlayingAudio(true);
    window.speechSynthesis.speak(utterance);
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto w-full">
      {/* Header */}
      <div className="mb-6">
        <div className="inline-flex items-center gap-2 rounded-full border border-violet-500/30 bg-violet-950/40 px-3 py-1 text-xs font-semibold text-violet-300 mb-2">
          <Languages className="h-3.5 w-3.5 text-violet-400" />
          <span>Multilingual Intelligence</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
          AI Language Translator
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          High-accuracy, contextual translation preserving nuances and idioms across 100+ languages.
        </p>
      </div>

      {/* Language Selector Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-[#111827]/90 p-3 shadow-lg backdrop-blur-xl mb-4">
        {/* Source Language */}
        <div className="flex items-center gap-2 flex-1 min-w-[140px]">
          <select
            value={sourceLang}
            onChange={(e) => {
              setSourceLang(e.target.value);
              setDetectedLang(null);
            }}
            className="w-full rounded-xl border border-slate-700 bg-slate-800/90 py-2 px-3 text-xs sm:text-sm font-medium text-slate-200 focus:border-violet-500 focus:outline-none"
          >
            {LANGUAGES.map((l) => (
              <option key={l.code} value={l.code}>
                {l.name}
              </option>
            ))}
          </select>
        </div>

        {/* Swap Button */}
        <button
          onClick={handleSwap}
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-700 bg-slate-800/80 text-slate-300 hover:border-violet-500 hover:text-white transition-colors"
          title="Swap languages"
        >
          <ArrowRightLeft className="h-4 w-4" />
        </button>

        {/* Target Language */}
        <div className="flex items-center gap-2 flex-1 min-w-[140px]">
          <select
            value={targetLang}
            onChange={(e) => setTargetLang(e.target.value)}
            className="w-full rounded-xl border border-slate-700 bg-slate-800/90 py-2 px-3 text-xs sm:text-sm font-medium text-slate-200 focus:border-violet-500 focus:outline-none"
          >
            {LANGUAGES.filter((l) => l.code !== 'auto').map((l) => (
              <option key={l.code} value={l.code}>
                {l.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Translation Panels Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {/* Source Box */}
        <div className="flex flex-col rounded-2xl border border-slate-700/80 bg-[#111827]/80 p-4 shadow-xl backdrop-blur-xl min-h-[260px]">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-3 text-xs text-slate-400">
            <span className="font-semibold text-slate-300">
              Source Text {detectedLang && `(Detected: ${detectedLang})`}
            </span>
            {inputText && (
              <button
                onClick={handleClear}
                className="hover:text-red-400 transition-colors"
              >
                Clear
              </button>
            )}
          </div>

          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Type or paste text to translate..."
            className="flex-1 w-full resize-none bg-transparent text-slate-100 placeholder-slate-500 text-sm focus:outline-none leading-relaxed"
          />

          <div className="flex items-center justify-between border-t border-slate-800/80 pt-3 mt-2 text-xs text-slate-500">
            <span>{inputText.length} characters</span>
            {inputText && (
              <button
                onClick={() => handleSpeech(inputText)}
                className="flex items-center gap-1 text-slate-400 hover:text-slate-200"
              >
                <Volume2 className="h-4 w-4" />
                <span>Listen</span>
              </button>
            )}
          </div>
        </div>

        {/* Target Box */}
        <div className="flex flex-col rounded-2xl border border-violet-900/40 bg-[#0e1424]/90 p-4 shadow-xl backdrop-blur-xl min-h-[260px]">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-3 text-xs text-slate-400">
            <span className="font-semibold text-violet-300">
              {targetLang} Translation
            </span>
            {translatedText && (
              <button
                onClick={handleCopy}
                className="flex items-center gap-1 hover:text-white transition-colors"
              >
                {copied ? (
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
            )}
          </div>

          <div className="flex-1 text-slate-100 text-sm leading-relaxed overflow-y-auto">
            {isTranslating ? (
              <div className="flex h-full items-center justify-center gap-2 text-violet-400 py-12">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>Translating with context...</span>
              </div>
            ) : translatedText ? (
              <p className="whitespace-pre-wrap">{translatedText}</p>
            ) : (
              <p className="text-slate-600 italic">
                Translation will appear here instantly...
              </p>
            )}
          </div>

          <div className="flex items-center justify-between border-t border-slate-800/80 pt-3 mt-2 text-xs text-slate-500">
            <span>{translatedText.length} characters</span>
            {translatedText && (
              <button
                onClick={() => handleSpeech(translatedText)}
                className="flex items-center gap-1 text-slate-400 hover:text-cyan-300"
              >
                {isPlayingAudio ? (
                  <VolumeX className="h-4 w-4 text-cyan-400" />
                ) : (
                  <Volume2 className="h-4 w-4" />
                )}
                <span>Listen</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-red-500/40 bg-red-950/40 p-3 text-xs text-red-300">
          {error}
        </div>
      )}

      {/* Action Button */}
      <div className="flex justify-end">
        <button
          onClick={handleTranslate}
          disabled={!inputText.trim() || isTranslating}
          className={`flex items-center gap-2 rounded-xl px-6 py-2.5 text-sm font-semibold transition-all ${
            !inputText.trim() || isTranslating
              ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
              : 'bg-gradient-to-tr from-violet-600 to-indigo-500 text-white shadow-lg shadow-violet-500/30 hover:scale-102 active:scale-98'
          }`}
        >
          {isTranslating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4" />
          )}
          <span>Translate</span>
        </button>
      </div>
    </div>
  );
};
