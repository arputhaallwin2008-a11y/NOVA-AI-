import React from 'react';
import { Sparkles, Code2, Brain, Compass, BookOpen, Layers } from 'lucide-react';

interface EmptyStateProps {
  onSelectPrompt: (prompt: string) => void;
}

const STARTER_PROMPTS = [
  {
    icon: Code2,
    title: 'Code & Software Architecture',
    subtitle: 'Write an asynchronous rate-limiter with token bucket algorithm in TypeScript',
    prompt: 'Write a robust, production-ready asynchronous rate-limiter in TypeScript using the token-bucket algorithm, with unit tests and type annotations.',
  },
  {
    icon: Brain,
    title: 'Explain Complex Topics',
    subtitle: 'Explain how Transformers and Attention mechanisms work mathematically',
    prompt: 'Explain how Transformer architectures and Self-Attention mechanisms work, with intuitive analogies and the core mathematical formulation.',
  },
  {
    icon: Compass,
    title: 'Strategic Planning',
    subtitle: 'Create a comprehensive 4-week roadmap to master system design interviews',
    prompt: 'Create a structured 4-week study roadmap to prepare for Senior System Design interviews, including topics, mock challenges, and key tradeoffs.',
  },
  {
    icon: Layers,
    title: 'Analysis & Trade-offs',
    subtitle: 'Compare PostgreSQL vs MongoDB for high-write financial ledger systems',
    prompt: 'Perform an in-depth architectural comparison between PostgreSQL (relational) and MongoDB (document) for an immutable financial audit ledger.',
  },
  {
    icon: BookOpen,
    title: 'Creative Writing',
    subtitle: 'Craft a compelling pitch deck narrative for an AI-powered developer tool',
    prompt: 'Draft an engaging, punchy narrative script for a seed-stage investor pitch deck for an innovative AI-assisted developer workflow tool.',
  },
];

export const EmptyState: React.FC<EmptyStateProps> = ({ onSelectPrompt }) => {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-8 text-center max-w-3xl mx-auto my-auto">
      {/* Hero Badge */}
      <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-violet-500/30 bg-violet-950/40 px-3.5 py-1 text-xs font-semibold text-violet-300 shadow-inner">
        <Sparkles className="h-3.5 w-3.5 text-violet-400" />
        <span>NOVA AI — Next-Gen Intelligence</span>
      </div>

      <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white mb-3">
        How can I assist you today?
      </h1>
      <p className="max-w-xl text-sm sm:text-base text-slate-400 mb-8">
        Your personal intelligent assistant for engineering, reasoning, synthesis, voice interaction, and creative creation.
      </p>

      {/* Grid of Starters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full text-left">
        {STARTER_PROMPTS.map((item, index) => {
          const Icon = item.icon;
          return (
            <button
              key={index}
              onClick={() => onSelectPrompt(item.prompt)}
              className="group flex flex-col justify-between rounded-xl border border-slate-800/90 bg-[#111827]/60 p-4 transition-all hover:border-violet-500/50 hover:bg-[#161f36]/80 hover:shadow-lg hover:shadow-violet-950/20 active:scale-[0.99]"
            >
              <div className="flex items-center gap-2.5 mb-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-900/30 text-violet-400 ring-1 ring-violet-500/20 group-hover:bg-violet-600 group-hover:text-white transition-colors">
                  <Icon className="h-4 w-4" />
                </div>
                <span className="text-xs font-bold text-slate-200 group-hover:text-violet-300 transition-colors">
                  {item.title}
                </span>
              </div>
              <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                {item.subtitle}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
};
