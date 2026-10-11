import React, { useState, useEffect, useRef } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';
import { ThemeProvider } from './context/ThemeContext.tsx';
import { Sidebar } from './components/layout/Sidebar.tsx';
import { Header } from './components/layout/Header.tsx';
import { ChatArea } from './components/chat/ChatArea.tsx';
import { MessageComposer } from './components/chat/MessageComposer.tsx';
import { ImageStudio } from './components/workspaces/ImageStudio.tsx';
import { TranslatorWorkspace } from './components/workspaces/TranslatorWorkspace.tsx';
import { DocumentWorkspace } from './components/workspaces/DocumentWorkspace.tsx';
import { MemoryWorkspace } from './components/workspaces/MemoryWorkspace.tsx';
import { StarredWorkspace } from './components/workspaces/StarredWorkspace.tsx';
import { AuthModal } from './components/modals/AuthModal.tsx';
import { SettingsModal } from './components/modals/SettingsModal.tsx';
import {
  Conversation,
  Message,
  ActiveWorkspace,
  FileAttachment,
} from './types.ts';
import { api } from './services/api.ts';

function MainApp() {
  const { user, isLoading: isAuthLoading, logout, preferences } = useAuth();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [activeWorkspace, setActiveWorkspace] = useState<ActiveWorkspace>('chat');
  const [isStreaming, setIsStreaming] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Streaming cancel controller
  const abortControllerRef = useRef<boolean>(false);

  // Load conversations when user authenticates
  useEffect(() => {
    if (user) {
      loadConversations();
    } else {
      setConversations([]);
      setActiveConversationId(null);
      setMessages([]);
    }
  }, [user]);

  // Load conversations with search term
  const loadConversations = async (search?: string) => {
    try {
      const res = await api.getConversations(search);
      setConversations(res.conversations);

      // If no active conversation and there are conversations, select the latest
      if (!activeConversationId && res.conversations.length > 0) {
        selectConversation(res.conversations[0].id);
      }
    } catch (err) {
      console.error('Failed to load conversations:', err);
    }
  };

  // Debounced search
  useEffect(() => {
    if (!user) return;
    const timer = setTimeout(() => {
      loadConversations(searchQuery);
    }, 250);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Select conversation and load its messages
  const selectConversation = async (id: string) => {
    setActiveConversationId(id);
    setActiveWorkspace('chat');
    try {
      const res = await api.getConversation(id);
      setMessages(res.messages);
    } catch (err) {
      console.error('Failed to load messages for conversation:', err);
    }
  };

  // Start new conversation
  const handleNewConversation = async () => {
    try {
      const res = await api.createConversation({ title: 'New Conversation' });
      setConversations([res.conversation, ...conversations]);
      setActiveConversationId(res.conversation.id);
      setMessages([]);
      setActiveWorkspace('chat');
    } catch (err) {
      console.error('Failed to create new conversation:', err);
    }
  };

  // Send message
  const handleSendMessage = async (
    content: string,
    webSearch: boolean,
    attachments: FileAttachment[]
  ) => {
    if (isStreaming) return;

    let targetConvId = activeConversationId;

    // Create a new conversation if none active
    if (!targetConvId) {
      try {
        const newConv = await api.createConversation({ title: 'New Conversation' });
        targetConvId = newConv.conversation.id;
        setActiveConversationId(targetConvId);
        setConversations([newConv.conversation, ...conversations]);
      } catch (err) {
        console.error('Failed to init conversation:', err);
        return;
      }
    }

    const tempUserMsgId = 'temp_u_' + Date.now();
    const tempAssistantMsgId = 'temp_a_' + Date.now();

    const userMsg: Message = {
      id: tempUserMsgId,
      conversation_id: targetConvId,
      role: 'user',
      content,
      created_at: new Date().toISOString(),
      status: 'completed',
      file_attachments: attachments,
    };

    const streamingMsg: Message = {
      id: tempAssistantMsgId,
      conversation_id: targetConvId,
      role: 'assistant',
      content: '',
      created_at: new Date().toISOString(),
      model_name: 'gemini-3.8-flash',
      status: 'streaming',
    };

    setMessages((prev) => [...prev, userMsg, streamingMsg]);
    setIsStreaming(true);
    abortControllerRef.current = false;

    let accumulatedText = '';

    await api.streamSendMessage({
      conversationId: targetConvId,
      content,
      webSearch,
      attachments,
      onChunk: (chunk) => {
        if (abortControllerRef.current) return;
        accumulatedText += chunk;
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === tempAssistantMsgId
              ? { ...msg, content: accumulatedText }
              : msg
          )
        );
      },
      onDone: (data) => {
        setIsStreaming(false);
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === tempAssistantMsgId
              ? {
                  ...msg,
                  id: data.messageId,
                  content: accumulatedText,
                  status: 'completed',
                  grounding_data: data.groundingSources || null,
                }
              : msg
          )
        );

        // If conversation title was automatically updated by Gemini
        if (data.newTitle) {
          setConversations((prev) =>
            prev.map((c) =>
              c.id === targetConvId ? { ...c, title: data.newTitle! } : c
            )
          );
        }
      },
      onError: (errMsg) => {
        setIsStreaming(false);
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === tempAssistantMsgId
              ? {
                  ...msg,
                  content:
                    accumulatedText ||
                    `⚠️ Service response issue: ${errMsg}. Please try again.`,
                  status: 'completed',
                }
              : msg
          )
        );
      },
    });
  };

  const handleStopStreaming = () => {
    abortControllerRef.current = true;
    setIsStreaming(false);
    setMessages((prev) =>
      prev.map((msg) =>
        msg.status === 'streaming' ? { ...msg, status: 'completed' } : msg
      )
    );
  };

  // Toggle star
  const handleStarToggle = async (messageId: string, currentStarred: boolean) => {
    try {
      if (currentStarred) {
        await api.unstarMessage(messageId);
      } else {
        await api.starMessage(messageId);
      }
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId ? { ...m, is_starred: !currentStarred } : m
        )
      );
    } catch (err) {
      console.error('Star toggle error:', err);
    }
  };

  // Regenerate last assistant response
  const handleRegenerate = async () => {
    if (!activeConversationId || isStreaming) return;
    setIsStreaming(true);

    const tempAssistantMsgId = 'regen_' + Date.now();
    setMessages((prev) => {
      // Remove last assistant message
      const filtered = prev.filter(
        (m, idx) => !(idx === prev.length - 1 && m.role === 'assistant')
      );
      return [
        ...filtered,
        {
          id: tempAssistantMsgId,
          conversation_id: activeConversationId,
          role: 'assistant',
          content: '',
          created_at: new Date().toISOString(),
          model_name: 'gemini-3.8-flash',
          status: 'streaming',
        },
      ];
    });

    try {
      const response = await fetch(
        `/api/conversations/${activeConversationId}/regenerate`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('nova_auth_token')}`,
          },
          body: JSON.stringify({
            webSearch: Boolean(preferences?.web_search_enabled),
          }),
        }
      );

      const reader = response.body?.getReader();
      if (!reader) throw new Error('Stream error');

      const decoder = new TextDecoder();
      let buffer = '';
      let accumulatedText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = JSON.parse(line.slice(6));
            if (data.type === 'chunk') {
              accumulatedText += data.text;
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === tempAssistantMsgId
                    ? { ...m, content: accumulatedText }
                    : m
                )
              );
            } else if (data.type === 'done') {
              setIsStreaming(false);
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === tempAssistantMsgId
                    ? {
                        ...m,
                        id: data.messageId,
                        status: 'completed',
                        grounding_data: data.groundingSources,
                      }
                    : m
                )
              );
            }
          }
        }
      }
    } catch (err: any) {
      setIsStreaming(false);
    }
  };

  // Rename conversation
  const handleRenameConversation = async (id: string, newTitle: string) => {
    try {
      await api.updateConversation(id, { title: newTitle });
      setConversations((prev) =>
        prev.map((c) => (c.id === id ? { ...c, title: newTitle } : c))
      );
    } catch (err) {
      console.error('Failed to rename conversation:', err);
    }
  };

  // Delete conversation
  const handleDeleteConversation = async (id: string) => {
    if (!confirm('Are you sure you want to delete this conversation?')) return;
    try {
      await api.deleteConversation(id);
      const remaining = conversations.filter((c) => c.id !== id);
      setConversations(remaining);
      if (activeConversationId === id) {
        if (remaining.length > 0) {
          selectConversation(remaining[0].id);
        } else {
          setActiveConversationId(null);
          setMessages([]);
        }
      }
    } catch (err) {
      console.error('Failed to delete conversation:', err);
    }
  };

  // Clear messages in current conversation
  const handleClearChat = async () => {
    if (!activeConversationId) return;
    if (!confirm('Clear all messages in this conversation?')) return;
    try {
      await api.clearConversation(activeConversationId);
      setMessages([]);
    } catch (err) {
      console.error('Failed to clear conversation:', err);
    }
  };

  // Handle document chat initiation from Document workspace
  const handleStartDocChat = async (
    attachment: FileAttachment,
    promptHint: string
  ) => {
    try {
      const res = await api.createConversation({
        title: `Document: ${attachment.name.slice(0, 24)}`,
      });
      setConversations([res.conversation, ...conversations]);
      setActiveConversationId(res.conversation.id);
      setActiveWorkspace('chat');
      setMessages([]);
      handleSendMessage(promptHint, false, [attachment]);
    } catch (err) {
      console.error('Failed to start document chat:', err);
    }
  };

  const currentConversation =
    conversations.find((c) => c.id === activeConversationId) || null;

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#0B0F19] font-sans text-slate-100 antialiased selection:bg-violet-500 selection:text-white">
      {/* Auth Modal if unauthenticated */}
      <AuthModal isOpen={!user && !isAuthLoading} />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />

      {/* Sidebar */}
      {user && (
        <Sidebar
          conversations={conversations}
          activeConversationId={activeConversationId}
          activeWorkspace={activeWorkspace}
          onSelectConversation={selectConversation}
          onNewConversation={handleNewConversation}
          onSelectWorkspace={setActiveWorkspace}
          onRenameConversation={handleRenameConversation}
          onDeleteConversation={handleDeleteConversation}
          onOpenSettings={() => setIsSettingsOpen(true)}
          user={user}
          onLogout={logout}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          isMobileOpen={isMobileMenuOpen}
          onCloseMobile={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Main Workspace Frame */}
      <div className="flex flex-1 flex-col overflow-hidden bg-[#0B0F19]">
        <Header
          onToggleMobileMenu={() => setIsMobileMenuOpen(true)}
          activeWorkspace={activeWorkspace}
          activeConversation={currentConversation}
          onClearChat={handleClearChat}
          onOpenSettings={() => setIsSettingsOpen(true)}
        />

        {/* Dynamic Workspace Container */}
        <main className="flex flex-1 flex-col overflow-hidden relative">
          {activeWorkspace === 'chat' && (
            <>
              <ChatArea
                messages={messages}
                isStreaming={isStreaming}
                onStarToggle={handleStarToggle}
                onRegenerate={handleRegenerate}
                onSelectPrompt={(p) =>
                  handleSendMessage(
                    p,
                    Boolean(preferences?.web_search_enabled),
                    []
                  )
                }
                voiceName={preferences?.voice_name || 'Zephyr'}
              />
              <MessageComposer
                onSendMessage={handleSendMessage}
                isStreaming={isStreaming}
                onStopStreaming={handleStopStreaming}
                defaultWebSearch={Boolean(preferences?.web_search_enabled)}
              />
            </>
          )}

          {activeWorkspace === 'images' && <ImageStudio />}

          {activeWorkspace === 'translator' && <TranslatorWorkspace />}

          {activeWorkspace === 'documents' && (
            <DocumentWorkspace onStartDocChat={handleStartDocChat} />
          )}

          {activeWorkspace === 'memory' && <MemoryWorkspace />}

          {activeWorkspace === 'starred' && (
            <StarredWorkspace
              onOpenConversation={(convId) => selectConversation(convId)}
            />
          )}
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <MainApp />
      </AuthProvider>
    </ThemeProvider>
  );
}
