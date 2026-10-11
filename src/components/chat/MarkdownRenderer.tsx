import React, { useState } from 'react';
import { Check, Copy } from 'lucide-react';

interface MarkdownRendererProps {
  content: string;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content }) => {
  // Parse code blocks with ```lang ... ```
  const parts = content.split(/(```[\s\S]*?```)/g);

  return (
    <div className="space-y-3 leading-relaxed text-slate-100 text-[15px]">
      {parts.map((part, index) => {
        if (part.startsWith('```') && part.endsWith('```')) {
          // Extract language and code
          const firstLineBreak = part.indexOf('\n');
          let lang = 'code';
          let codeText = '';

          if (firstLineBreak !== -1) {
            lang = part.slice(3, firstLineBreak).trim() || 'code';
            codeText = part.slice(firstLineBreak + 1, -3);
          } else {
            codeText = part.slice(3, -3);
          }

          return <CodeBlock key={index} code={codeText} language={lang} />;
        }

        // Render standard markdown paragraphs, lists, bold, italics, headers
        return <FormattedText key={index} text={part} />;
      })}
    </div>
  );
};

const CodeBlock: React.FC<{ code: string; language: string }> = ({ code, language }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative my-3 overflow-hidden rounded-xl border border-slate-700/60 bg-[#0d121f] font-mono text-[13px] shadow-lg">
      <div className="flex items-center justify-between border-b border-slate-800 bg-[#141b2d] px-4 py-2 text-xs text-slate-400">
        <span className="font-semibold uppercase tracking-wider text-slate-300">{language}</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-slate-300 transition-colors hover:bg-slate-700/60 hover:text-white"
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
      </div>
      <div className="overflow-x-auto p-4 text-slate-200">
        <pre className="m-0 leading-5 whitespace-pre">
          <code>{code}</code>
        </pre>
      </div>
    </div>
  );
};

const FormattedText: React.FC<{ text: string }> = ({ text }) => {
  const lines = text.split('\n');

  return (
    <div className="space-y-2">
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        if (!trimmed) return <div key={idx} className="h-1" />;

        // Header ###
        if (line.startsWith('### ')) {
          return (
            <h3 key={idx} className="mt-3 text-base font-bold text-violet-300">
              {formatInline(line.slice(4))}
            </h3>
          );
        }
        // Header ##
        if (line.startsWith('## ')) {
          return (
            <h2 key={idx} className="mt-4 text-lg font-bold text-white border-b border-slate-700/40 pb-1">
              {formatInline(line.slice(3))}
            </h2>
          );
        }
        // Header #
        if (line.startsWith('# ')) {
          return (
            <h1 key={idx} className="mt-5 text-xl font-extrabold text-white">
              {formatInline(line.slice(2))}
            </h1>
          );
        }

        // Bullet item - or *
        if (line.startsWith('- ') || line.startsWith('* ')) {
          return (
            <div key={idx} className="flex items-start gap-2 pl-2">
              <span className="text-violet-400 mt-1 select-none">•</span>
              <span className="flex-1 text-slate-200">{formatInline(line.slice(2))}</span>
            </div>
          );
        }

        // Numbered list item "1. "
        const numMatch = line.match(/^(\d+)\.\s+(.*)/);
        if (numMatch) {
          return (
            <div key={idx} className="flex items-start gap-2 pl-2">
              <span className="font-semibold text-violet-400 select-none">{numMatch[1]}.</span>
              <span className="flex-1 text-slate-200">{formatInline(numMatch[2])}</span>
            </div>
          );
        }

        // Blockquote >
        if (line.startsWith('> ')) {
          return (
            <blockquote key={idx} className="border-l-4 border-violet-500/80 bg-violet-950/20 py-1 px-3 text-slate-300 italic rounded-r">
              {formatInline(line.slice(2))}
            </blockquote>
          );
        }

        // Normal paragraph
        return (
          <p key={idx} className="text-slate-200">
            {formatInline(line)}
          </p>
        );
      })}
    </div>
  );
};

// Format bold (**text**), italic (*text*), inline code (`code`), and markdown links [text](url)
function formatInline(str: string): React.ReactNode[] {
  const tokens: React.ReactNode[] = [];
  // Regex parsing inline tokens
  const regex = /(\*\*.*?\*\*|\*.*?\*|`.*?`|\[.*?\]\(.*?\))/g;
  const parts = str.split(regex);

  parts.forEach((part, i) => {
    if (!part) return;

    if (part.startsWith('**') && part.endsWith('**')) {
      tokens.push(
        <strong key={i} className="font-semibold text-white">
          {part.slice(2, -2)}
        </strong>
      );
    } else if (part.startsWith('*') && part.endsWith('*')) {
      tokens.push(
        <em key={i} className="italic text-slate-300">
          {part.slice(1, -1)}
        </em>
      );
    } else if (part.startsWith('`') && part.endsWith('`')) {
      tokens.push(
        <code
          key={i}
          className="rounded bg-slate-800/80 px-1.5 py-0.5 font-mono text-[13px] text-cyan-300 border border-slate-700/50"
        >
          {part.slice(1, -1)}
        </code>
      );
    } else if (part.startsWith('[') && part.includes('](') && part.endsWith(')')) {
      const match = part.match(/\[(.*?)\]\((.*?)\)/);
      if (match) {
        tokens.push(
          <a
            key={i}
            href={match[2]}
            target="_blank"
            rel="noopener noreferrer"
            className="text-cyan-400 underline underline-offset-2 hover:text-cyan-300 transition-colors"
          >
            {match[1]}
          </a>
        );
      } else {
        tokens.push(part);
      }
    } else {
      tokens.push(part);
    }
  });

  return tokens;
}
