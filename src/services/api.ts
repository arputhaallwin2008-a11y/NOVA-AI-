import {
  User,
  Conversation,
  Message,
  StarredItem,
  GeneratedImage,
  UserPreferences,
  UserMemory,
  GroundingSource,
  FileAttachment,
} from '../types.ts';

const TOKEN_KEY = 'nova_auth_token';

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string | null) {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeStoredItem?.(TOKEN_KEY) || localStorage.removeItem(TOKEN_KEY);
  }
}

async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getStoredToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(endpoint, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || `Request failed with status ${response.status}`);
  }

  return data as T;
}

export const api = {
  // Auth
  async register(data: { email: string; password: string; displayName: string }) {
    return apiRequest<{ token: string; user: User; message: string }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async login(data: { email: string; password: string }) {
    return apiRequest<{ token: string; user: User; message: string }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async guestLogin() {
    return apiRequest<{ token: string; user: User; message: string }>('/api/auth/guest', {
      method: 'POST',
    });
  },

  async getMe() {
    return apiRequest<{ user: User; preferences: UserPreferences }>('/api/auth/me');
  },

  async updateProfile(displayName: string, avatarUrl?: string) {
    return apiRequest<{ user: User; message: string }>('/api/auth/profile', {
      method: 'PUT',
      body: JSON.stringify({ displayName, avatarUrl }),
    });
  },

  async deleteAccount() {
    return apiRequest<{ message: string }>('/api/auth/account', {
      method: 'DELETE',
    });
  },

  // Conversations
  async getConversations(search?: string, archived?: boolean) {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (archived !== undefined) params.set('archived', String(archived));
    const qs = params.toString() ? `?${params.toString()}` : '';
    return apiRequest<{ conversations: Conversation[] }>(`/api/conversations${qs}`);
  },

  async createConversation(data: { title?: string; systemPrompt?: string; modelName?: string }) {
    return apiRequest<{ conversation: Conversation }>('/api/conversations', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async getConversation(id: string) {
    return apiRequest<{ conversation: Conversation; messages: Message[] }>(`/api/conversations/${id}`);
  },

  async updateConversation(id: string, updates: { title?: string; archived?: boolean }) {
    return apiRequest<{ message: string }>(`/api/conversations/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  },

  async deleteConversation(id: string) {
    return apiRequest<{ message: string }>(`/api/conversations/${id}`, {
      method: 'DELETE',
    });
  },

  async clearConversation(id: string) {
    return apiRequest<{ message: string }>(`/api/conversations/${id}/clear`, {
      method: 'POST',
    });
  },

  // Chat message sending with Server-Sent Events (SSE) streaming support
  async streamSendMessage({
    conversationId,
    content,
    webSearch,
    attachments,
    onChunk,
    onDone,
    onError,
  }: {
    conversationId: string;
    content: string;
    webSearch?: boolean;
    attachments?: FileAttachment[];
    onChunk: (chunkText: string) => void;
    onDone: (data: { messageId: string; groundingSources?: GroundingSource[]; newTitle?: string }) => void;
    onError: (err: string) => void;
  }) {
    const token = getStoredToken();
    try {
      const response = await fetch(`/api/conversations/${conversationId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          content,
          webSearch,
          attachments,
          stream: true,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('Response body stream not available');

      const decoder = new TextDecoder('utf-8');
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith('data: ')) {
            try {
              const data = JSON.parse(trimmed.slice(6));
              if (data.type === 'chunk') {
                onChunk(data.text);
              } else if (data.type === 'done') {
                onDone({
                  messageId: data.messageId,
                  groundingSources: data.groundingSources,
                  newTitle: data.newTitle,
                });
              } else if (data.type === 'error') {
                onError(data.error);
              }
            } catch {
              // Ignore line parse edge case
            }
          }
        }
      }
    } catch (err: any) {
      onError(err.message || 'Stream connection interrupted.');
    }
  },

  // Starred items
  async getStarred() {
    return apiRequest<{ starredItems: StarredItem[] }>('/api/starred');
  },

  async starMessage(messageId: string) {
    return apiRequest<{ message: string; starId: string }>(`/api/starred/${messageId}`, {
      method: 'POST',
    });
  },

  async unstarMessage(messageId: string) {
    return apiRequest<{ message: string }>(`/api/starred/${messageId}`, {
      method: 'DELETE',
    });
  },

  // Image Generation
  async getImages() {
    return apiRequest<{ images: GeneratedImage[] }>('/api/images');
  },

  async generateImage(data: { prompt: string; aspectRatio?: string; style?: string }) {
    return apiRequest<{ image: GeneratedImage }>('/api/images/generate', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async deleteImage(id: string) {
    return apiRequest<{ message: string }>(`/api/images/${id}`, {
      method: 'DELETE',
    });
  },

  // Translation
  async translate(data: { text: string; sourceLang?: string; targetLang?: string }) {
    return apiRequest<{ translatedText: string; detectedSourceLang?: string }>('/api/translate', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Voice TTS
  async textToSpeech(data: { text: string; voice?: string }) {
    return apiRequest<{ audioUrl: string; mimeType: string }>('/api/voice/tts', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Memories
  async getMemories() {
    return apiRequest<{ memories: UserMemory[] }>('/api/memories');
  },

  async addMemory(memory_content: string) {
    return apiRequest<{ memory: UserMemory; message: string }>('/api/memories', {
      method: 'POST',
      body: JSON.stringify({ memory_content }),
    });
  },

  async updateMemory(id: string, memory_content: string) {
    return apiRequest<{ memory: UserMemory; message: string }>(`/api/memories/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ memory_content }),
    });
  },

  async deleteMemory(id: string) {
    return apiRequest<{ message: string }>(`/api/memories/${id}`, {
      method: 'DELETE',
    });
  },

  async clearMemories() {
    return apiRequest<{ message: string }>('/api/memories', {
      method: 'DELETE',
    });
  },

  // Preferences
  async getPreferences() {
    return apiRequest<{ preferences: UserPreferences }>('/api/preferences');
  },

  async updatePreferences(prefs: Partial<UserPreferences>) {
    return apiRequest<{ message: string; preferences: UserPreferences }>('/api/preferences', {
      method: 'PUT',
      body: JSON.stringify(prefs),
    });
  },

  // Documents
  async uploadDocument(data: { name: string; mimeType: string; base64Data?: string; textContent?: string }) {
    return apiRequest<{
      document: {
        id: string;
        name: string;
        mimeType: string;
        size: number;
        previewText: string;
        totalCharacters: number;
        summary: string;
        base64Data?: string;
      };
      message: string;
    }>('/api/documents/upload', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};
