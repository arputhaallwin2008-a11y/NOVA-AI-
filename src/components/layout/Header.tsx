import React from 'react';
import {
  Menu,
  Sparkles,
  Sun,
  Moon,
  Trash2,
  Settings,
  Layers,
} from 'lucide-react';
import { ActiveWorkspace, Conversation } from '../../types.ts';
import { useTheme } from '../../context/ThemeContext.tsx';

interface HeaderProps {
  onToggleMobileMenu: () => void;
  activeWorkspace: ActiveWorkspace;
  activeConversation: Conversation | null;
  onClearChat?: () => void;
  onOpenSettings: () => void;
}

const WORKSPACE_TITLES: Record<ActiveWorkspace, string> = {
  chat: 'AI Chat Assistant',
  images: 'Image Studio',
  translator: 'AI Language Translator',
  documents: 'Document Assistant',
  memory: 'Personal Memory',
  starred: 'Starred Items',
};

export const Header: React.FC<HeaderProps> = ({
  onToggleMobileMenu,
  activeWorkspace,
  activeConversation,
  onClearChat,
  onOpenSettings,
}) => {
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="flex h-16 items-center justify-between border-b border-slate-800/80 bg-[#0B0F19]/80 px-4 sm:px-6 backdrop-blur-md">
      {/* Left items: Mobile Hamburger + Current Title */}
      <div className="flex items-center gap-3 overflow-hidden">
        <button
          onClick={onToggleMobileMenu}
          className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white md:hidden"
          title="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-2 overflow-hidden">
          <div className="flex flex-col overflow-hidden">
            <h2 className="truncate text-sm sm:text-base font-bold text-white">
              {activeWorkspace === 'chat'
                ? activeConversation?.title || 'New Conversation'
                : WORKSPACE_TITLES[activeWorkspace]}
            </h2>
            <div className="flex items-center gap-2 text-[10px] text-slate-400">
              <span className="flex items-center gap-1 text-emerald-400 font-medium">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Connected
              </span>
              <span>•</span>
              <span className="text-violet-300 font-mono">gemini-3.8-flash</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right controls: Clear chat, Theme toggle, Settings */}
      <div className="flex items-center gap-1.5 sm:gap-2">
        {activeWorkspace === 'chat' && onClearChat && activeConversation && (
          <button
            onClick={onClearChat}
            className="hidden sm:flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-900/60 px-3 py-1.5 text-xs text-slate-400 hover:border-red-500/40 hover:bg-red-950/20 hover:text-red-300 transition-all"
            title="Clear all messages in this conversation"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>Clear Chat</span>
          </button>
        )}

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="rounded-xl border border-slate-800 bg-slate-900/60 p-2 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
          title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
        >
          {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>

        {/* Settings button */}
        <button
          onClick={onOpenSettings}
          className="rounded-xl border border-slate-800 bg-slate-900/60 p-2 text-slate-400 hover:bg-slate-800 hover:text-violet-300 transition-colors"
          title="Platform Settings & Personality Prompt"
        >
          <Settings className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
};
