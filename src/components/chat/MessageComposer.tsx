import React, { useState, useRef, useEffect } from 'react';
import {
  ArrowUp,
  Mic,
  MicOff,
  Globe,
  Paperclip,
  X,
  Square,
  FileText,
  AlertCircle,
} from 'lucide-react';
import { FileAttachment } from '../../types.ts';
import { api } from '../../services/api.ts';

interface MessageComposerProps {
  onSendMessage: (content: string, webSearch: boolean, attachments: FileAttachment[]) => void;
  isStreaming: boolean;
  onStopStreaming?: () => void;
  defaultWebSearch?: boolean;
}

export const MessageComposer: React.FC<MessageComposerProps> = ({
  onSendMessage,
  isStreaming,
  onStopStreaming,
  defaultWebSearch = true,
}) => {
  const [input, setInput] = useState('');
  const [webSearchEnabled, setWebSearchEnabled] = useState(defaultWebSearch);
  const [isListening, setIsListening] = useState(false);
  const [speechError, setSpeechError] = useState<string | null>(null);
  const [attachments, setAttachments] = useState<FileAttachment[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setWebSearchEnabled(defaultWebSearch);
  }, [defaultWebSearch]);

  // Adjust textarea height automatically
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
    }
  }, [input]);

  // Initialize Web Speech Recognition
  const toggleListening = () => {
    if (isListening) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsListening(false);
      return;
    }

    setSpeechError(null);
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setSpeechError('Speech recognition is not supported in this browser. Please type your message.');
      setTimeout(() => setSpeechError(null), 4000);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          transcript += event.results[i][0].transcript;
        }
        if (transcript) {
          setInput((prev) => (prev ? `${prev} ${transcript}` : transcript));
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition error:', event.error);
        if (event.error === 'not-allowed') {
          setSpeechError('Microphone access was denied. Please allow microphone permissions.');
        } else {
          setSpeechError(`Voice input error: ${event.error}`);
        }
        setIsListening(false);
        setTimeout(() => setSpeechError(null), 5000);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err: any) {
      setSpeechError('Could not start microphone.');
      setIsListening(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSend = () => {
    if ((!input.trim() && attachments.length === 0) || isStreaming) return;
    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }

    onSendMessage(input.trim(), webSearchEnabled, attachments);
    setInput('');
    setAttachments([]);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  // Handle file attachment
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    setIsUploading(true);

    try {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const base64Data = (reader.result as string).split(',')[1];
          const uploadRes = await api.uploadDocument({
            name: file.name,
            mimeType: file.type || 'text/plain',
            base64Data,
          });

          setAttachments((prev) => [
            ...prev,
            {
              name: file.name,
              mimeType: file.type || 'text/plain',
              size: file.size,
              previewText: uploadRes.document.previewText,
              data: uploadRes.document.base64Data,
            },
          ]);
        } catch (err: any) {
          setSpeechError(err.message || 'File upload failed');
          setTimeout(() => setSpeechError(null), 4000);
        } finally {
          setIsUploading(false);
        }
      };
      reader.readAsDataURL(file);
    } catch {
      setIsUploading(false);
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 pb-4">
      {/* Voice or Upload error toast */}
      {speechError && (
        <div className="mb-2 flex items-center gap-2 rounded-lg border border-red-500/40 bg-red-950/60 px-3 py-2 text-xs text-red-200 animate-fadeIn">
          <AlertCircle className="h-4 w-4 text-red-400 flex-shrink-0" />
          <span>{speechError}</span>
        </div>
      )}

      {/* Listening Status Bar */}
      {isListening && (
        <div className="mb-2 flex items-center justify-between rounded-xl border border-red-500/40 bg-red-950/40 px-4 py-2.5 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <span className="relative flex h-3 w-3">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex h-3 w-3 rounded-full bg-red-500"></span>
            </span>
            <span className="text-xs font-medium text-red-200">
              Listening... Speak clearly into your microphone
            </span>
          </div>
          <button
            onClick={toggleListening}
            className="rounded-lg bg-red-900/60 hover:bg-red-800 px-2.5 py-1 text-xs font-semibold text-white transition-colors"
          >
            Stop Listening
          </button>
        </div>
      )}

      {/* Main Composer Box */}
      <div className="relative rounded-2xl border border-slate-700/70 bg-[#111827]/90 shadow-2xl backdrop-blur-xl transition-all focus-within:border-violet-500 focus-within:ring-2 focus-within:ring-violet-500/20">
        {/* Attached files chips */}
        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-2 p-3 pb-0">
            {attachments.map((att, idx) => (
              <div
                key={idx}
                className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800/90 py-1 px-3 text-xs text-slate-200"
              >
                <FileText className="h-3.5 w-3.5 text-violet-400" />
                <span className="truncate max-w-[180px] font-medium">{att.name}</span>
                <button
                  onClick={() => removeAttachment(idx)}
                  className="rounded p-0.5 text-slate-400 hover:bg-slate-700 hover:text-white"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Input Textarea */}
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            isListening
              ? 'Listening...'
              : 'Ask NOVA anything, write code, plan, compare... (Shift+Enter for new line)'
          }
          rows={1}
          disabled={isStreaming}
          className="w-full resize-none bg-transparent px-4 py-3.5 text-slate-100 placeholder-slate-400 text-[15px] focus:outline-none"
        />

        {/* Bottom Control Bar */}
        <div className="flex items-center justify-between border-t border-slate-800/80 px-3 py-2 text-xs">
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* File Upload hidden input */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.txt,.md,.json,.csv"
              onChange={handleFileChange}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading || isStreaming}
              className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors"
              title="Attach document (PDF, TXT, MD, JSON, CSV)"
            >
              <Paperclip className="h-4 w-4" />
              <span className="hidden sm:inline">
                {isUploading ? 'Analyzing...' : 'Attach'}
              </span>
            </button>

            {/* Web Search Grounding Toggle */}
            <button
              type="button"
              onClick={() => setWebSearchEnabled(!webSearchEnabled)}
              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 transition-colors ${
                webSearchEnabled
                  ? 'bg-cyan-950/80 text-cyan-300 border border-cyan-800/60'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-slate-300'
              }`}
              title="Toggle Google Web Search Grounding"
            >
              <Globe className="h-4 w-4" />
              <span className="hidden sm:inline">Search Web</span>
              {webSearchEnabled && (
                <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
              )}
            </button>

            {/* Microphone STT button */}
            <button
              type="button"
              onClick={toggleListening}
              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 transition-colors ${
                isListening
                  ? 'bg-red-500/20 text-red-300 border border-red-500/40 animate-pulse'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
              }`}
              title={isListening ? 'Stop listening' : 'Speak message'}
            >
              {isListening ? <MicOff className="h-4 w-4 text-red-400" /> : <Mic className="h-4 w-4" />}
              <span className="hidden sm:inline">Voice</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            {/* If streaming, show stop button */}
            {isStreaming ? (
              <button
                type="button"
                onClick={onStopStreaming}
                className="flex items-center gap-1.5 rounded-xl bg-red-600 hover:bg-red-700 px-3 py-1.5 font-medium text-white shadow-md shadow-red-600/30 transition-colors"
              >
                <Square className="h-3.5 w-3.5 fill-current" />
                <span>Stop</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSend}
                disabled={!input.trim() && attachments.length === 0}
                className={`flex h-8 w-8 items-center justify-center rounded-xl font-medium transition-all ${
                  input.trim() || attachments.length > 0
                    ? 'bg-gradient-to-tr from-violet-600 to-indigo-500 text-white shadow-md shadow-violet-500/30 hover:scale-105 active:scale-95'
                    : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                }`}
                title="Send message (Enter)"
              >
                <ArrowUp className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
