import React, { useRef, useEffect } from 'react';
import { Message } from '../../types.ts';
import { MessageItem } from './MessageItem.tsx';
import { EmptyState } from './EmptyState.tsx';

interface ChatAreaProps {
  messages: Message[];
  isStreaming: boolean;
  onStarToggle: (messageId: string, currentStarred: boolean) => void;
  onRegenerate?: () => void;
  onSelectPrompt: (prompt: string) => void;
  voiceName?: string;
}

export const ChatArea: React.FC<ChatAreaProps> = ({
  messages,
  isStreaming,
  onStarToggle,
  onRegenerate,
  onSelectPrompt,
  voiceName,
}) => {
  const scrollEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages or stream chunks
  useEffect(() => {
    scrollEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isStreaming]);

  if (messages.length === 0) {
    return (
      <div className="flex-1 overflow-y-auto flex flex-col justify-center">
        <EmptyState onSelectPrompt={onSelectPrompt} />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto divide-y divide-slate-800/40">
      <div className="max-w-4xl mx-auto w-full py-4">
        {messages.map((message, index) => {
          const isLatest = index === messages.length - 1;
          return (
            <MessageItem
              key={message.id || index}
              message={message}
              isLatest={isLatest}
              onStarToggle={onStarToggle}
              onRegenerate={isLatest && message.role === 'assistant' ? onRegenerate : undefined}
              voiceName={voiceName}
            />
          );
        })}
        <div ref={scrollEndRef} className="h-4" />
      </div>
    </div>
  );
};
