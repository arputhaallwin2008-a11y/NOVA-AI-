import React, { useState } from 'react';
import {
  Sparkles,
  Plus,
  MessageSquare,
  Image as ImageIcon,
  Languages,
  FileText,
  Brain,
  Star,
  Search,
  Settings,
  LogOut,
  Trash2,
  Edit2,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  Check,
  X,
  User as UserIcon,
} from 'lucide-react';
import { Conversation, ActiveWorkspace, User } from '../../types.ts';

interface SidebarProps {
  conversations: Conversation[];
  activeConversationId: string | null;
  activeWorkspace: ActiveWorkspace;
  onSelectConversation: (id: string) => void;
  onNewConversation: () => void;
  onSelectWorkspace: (workspace: ActiveWorkspace) => void;
  onRenameConversation: (id: string, newTitle: string) => void;
  onDeleteConversation: (id: string) => void;
  onOpenSettings: () => void;
  user: User | null;
  onLogout: () => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  conversations,
  activeConversationId,
  activeWorkspace,
  onSelectConversation,
  onNewConversation,
  onSelectWorkspace,
  onRenameConversation,
  onDeleteConversation,
  onOpenSettings,
  user,
  onLogout,
  isCollapsed,
  onToggleCollapse,
  searchQuery,
  onSearchChange,
  isMobileOpen,
  onCloseMobile,
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);

  // Group conversations by time
  const groupConversations = () => {
    const today: Conversation[] = [];
    const yesterday: Conversation[] = [];
    const lastWeek: Conversation[] = [];
    const older: Conversation[] = [];

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const yesterdayStart = todayStart - 86400000;
    const lastWeekStart = todayStart - 86400000 * 7;

    conversations.forEach((conv) => {
      const convTime = new Date(conv.updated_at).getTime();
      if (convTime >= todayStart) {
        today.push(conv);
      } else if (convTime >= yesterdayStart) {
        yesterday.push(conv);
      } else if (convTime >= lastWeekStart) {
        lastWeek.push(conv);
      } else {
        older.push(conv);
      }
    });

    return { today, yesterday, lastWeek, older };
  };

  const groups = groupConversations();

  const handleStartRename = (conv: Conversation) => {
    setEditingId(conv.id);
    setEditTitle(conv.title);
    setMenuOpenId(null);
  };

  const handleSaveRename = (id: string) => {
    if (editTitle.trim()) {
      onRenameConversation(id, editTitle.trim());
    }
    setEditingId(null);
  };

  const WORKSPACE_NAV: { id: ActiveWorkspace; label: string; icon: any }[] = [
    { id: 'chat', label: 'AI Chat Assistant', icon: MessageSquare },
    { id: 'images', label: 'Image Studio', icon: ImageIcon },
    { id: 'translator', label: 'AI Translator', icon: Languages },
    { id: 'documents', label: 'Document Assistant', icon: FileText },
    { id: 'memory', label: 'Personal Memory', icon: Brain },
    { id: 'starred', label: 'Starred Items', icon: Star },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm md:hidden transition-opacity"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex flex-col border-r border-slate-800 bg-[#0B0F19] transition-all duration-300 md:static ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        } ${isCollapsed ? 'md:w-20' : 'w-72 md:w-72'}`}
      >
        {/* Brand & Toggle Header */}
        <div className="flex h-16 items-center justify-between border-b border-slate-800/80 px-4">
          <div
            onClick={() => onSelectWorkspace('chat')}
            className={`flex items-center gap-3 cursor-pointer select-none overflow-hidden ${
              isCollapsed ? 'justify-center w-full' : ''
            }`}
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-500 shadow-md shadow-violet-500/30 ring-1 ring-violet-400/40 flex-shrink-0">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            {!isCollapsed && (
              <div className="flex flex-col">
                <span className="text-base font-extrabold tracking-wider bg-gradient-to-r from-white via-slate-100 to-violet-300 bg-clip-text text-transparent">
                  NOVA AI
                </span>
                <span className="text-[10px] text-violet-400 font-semibold tracking-widest uppercase">
                  Assistant Platform
                </span>
              </div>
            )}
          </div>

          {!isCollapsed && (
            <button
              onClick={onToggleCollapse}
              className="hidden md:flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
              title="Collapse sidebar"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* If collapsed on desktop, show expand button */}
        {isCollapsed && (
          <div className="hidden md:flex justify-center py-2 border-b border-slate-800/40">
            <button
              onClick={onToggleCollapse}
              className="h-8 w-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
              title="Expand sidebar"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Action: New Chat button */}
        <div className="p-3">
          <button
            onClick={() => {
              onNewConversation();
              onCloseMobile();
            }}
            className={`flex w-full items-center gap-2.5 rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-600 p-2.5 text-xs font-semibold text-white shadow-lg shadow-violet-600/25 transition-all hover:scale-102 hover:shadow-violet-600/40 active:scale-98 ${
              isCollapsed ? 'justify-center' : ''
            }`}
            title="Start new conversation"
          >
            <Plus className="h-4 w-4 flex-shrink-0" />
            {!isCollapsed && <span>New Conversation</span>}
          </button>
        </div>

        {/* Workspace Switcher Navigation */}
        <div className="px-3 py-1 space-y-1 border-b border-slate-800/80">
          {WORKSPACE_NAV.map((nav) => {
            const Icon = nav.icon;
            const isActive = activeWorkspace === nav.id;
            return (
              <button
                key={nav.id}
                onClick={() => {
                  onSelectWorkspace(nav.id);
                  onCloseMobile();
                }}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-violet-950/60 text-violet-300 font-semibold border border-violet-800/50 shadow-sm'
                    : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
                } ${isCollapsed ? 'justify-center px-0' : ''}`}
                title={nav.label}
              >
                <Icon className={`h-4 w-4 flex-shrink-0 ${isActive ? 'text-violet-400' : ''}`} />
                {!isCollapsed && <span>{nav.label}</span>}
              </button>
            );
          })}
        </div>

        {/* Search input if not collapsed */}
        {!isCollapsed && (
          <div className="px-3 pt-3">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Search chats..."
                className="w-full rounded-xl border border-slate-800 bg-slate-900/80 py-1.5 pl-8 pr-3 text-xs text-slate-200 placeholder-slate-500 focus:border-violet-500 focus:outline-none"
              />
            </div>
          </div>
        )}

        {/* Conversations History list */}
        <div className="flex-1 overflow-y-auto px-2 py-3 space-y-4">
          {!isCollapsed && (
            <>
              {renderGroup('Today', groups.today)}
              {renderGroup('Yesterday', groups.yesterday)}
              {renderGroup('Previous 7 Days', groups.lastWeek)}
              {renderGroup('Older', groups.older)}
            </>
          )}

          {isCollapsed && (
            <div className="flex flex-col items-center gap-1.5 pt-2">
              {conversations.slice(0, 10).map((c) => (
                <button
                  key={c.id}
                  onClick={() => onSelectConversation(c.id)}
                  className={`h-9 w-9 rounded-xl flex items-center justify-center text-xs transition-colors ${
                    activeConversationId === c.id
                      ? 'bg-violet-600 text-white shadow-md'
                      : 'text-slate-400 hover:bg-slate-800'
                  }`}
                  title={c.title}
                >
                  <MessageSquare className="h-4 w-4" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer User Profile & Settings */}
        <div className="border-t border-slate-800 bg-[#090d15] p-3">
          <div className="flex items-center justify-between">
            <div
              className={`flex items-center gap-2.5 overflow-hidden ${
                isCollapsed ? 'justify-center w-full' : ''
              }`}
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-800 text-slate-200 ring-1 ring-slate-700 flex-shrink-0">
                <UserIcon className="h-4 w-4" />
              </div>
              {!isCollapsed && (
                <div className="flex flex-col overflow-hidden">
                  <span className="truncate text-xs font-semibold text-slate-200">
                    {user?.displayName || 'Nova User'}
                  </span>
                  <span className="truncate text-[10px] text-slate-500">
                    {user?.email || 'User Account'}
                  </span>
                </div>
              )}
            </div>

            {!isCollapsed && (
              <div className="flex items-center gap-1">
                <button
                  onClick={onOpenSettings}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors"
                  title="Settings"
                >
                  <Settings className="h-4 w-4" />
                </button>
                <button
                  onClick={onLogout}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-red-400 transition-colors"
                  title="Sign out"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );

  function renderGroup(title: string, items: Conversation[]) {
    if (items.length === 0) return null;
    return (
      <div className="space-y-1">
        <span className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">
          {title}
        </span>
        <div className="space-y-0.5">
          {items.map((conv) => {
            const isActive = activeConversationId === conv.id && activeWorkspace === 'chat';
            return (
              <div
                key={conv.id}
                className={`group relative flex items-center justify-between rounded-xl px-3 py-2 text-xs transition-colors ${
                  isActive
                    ? 'bg-violet-950/60 text-violet-200 font-semibold border border-violet-800/40'
                    : 'text-slate-300 hover:bg-slate-800/50 hover:text-white'
                }`}
              >
                {editingId === conv.id ? (
                  <div className="flex flex-1 items-center gap-1">
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSaveRename(conv.id)}
                      className="flex-1 rounded bg-slate-900 px-2 py-1 text-xs text-white focus:outline-none ring-1 ring-violet-500"
                      autoFocus
                    />
                    <button
                      onClick={() => handleSaveRename(conv.id)}
                      className="text-emerald-400 p-0.5"
                    >
                      <Check className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="text-slate-400 p-0.5"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : (
                  <>
                    <button
                      onClick={() => {
                        onSelectWorkspace('chat');
                        onSelectConversation(conv.id);
                        onCloseMobile();
                      }}
                      className="flex-1 truncate text-left"
                    >
                      {conv.title}
                    </button>

                    <div className="relative opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setMenuOpenId(menuOpenId === conv.id ? null : conv.id);
                        }}
                        className="rounded p-1 text-slate-400 hover:text-white"
                      >
                        <MoreVertical className="h-3.5 w-3.5" />
                      </button>

                      {menuOpenId === conv.id && (
                        <div
                          onClick={(e) => e.stopPropagation()}
                          className="absolute right-0 top-6 z-20 w-28 rounded-xl border border-slate-700 bg-slate-900 py-1 shadow-xl text-xs"
                        >
                          <button
                            onClick={() => handleStartRename(conv)}
                            className="flex w-full items-center gap-2 px-3 py-1.5 text-slate-300 hover:bg-slate-800"
                          >
                            <Edit2 className="h-3 w-3" />
                            <span>Rename</span>
                          </button>
                          <button
                            onClick={() => {
                              onDeleteConversation(conv.id);
                              setMenuOpenId(null);
                            }}
                            className="flex w-full items-center gap-2 px-3 py-1.5 text-red-400 hover:bg-slate-800"
                          >
                            <Trash2 className="h-3 w-3" />
                            <span>Delete</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }
};
