export interface User {
  id: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
  createdAt?: string;
}

export interface GroundingSource {
  title: string;
  url: string;
}

export interface FileAttachment {
  name: string;
  mimeType: string;
  size?: number;
  previewText?: string;
  data?: string; // base64 if needed
}

export interface Message {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  created_at: string;
  model_name?: string;
  status: 'streaming' | 'completed' | 'error';
  is_starred?: boolean;
  grounding_data?: GroundingSource[] | null;
  file_attachments?: FileAttachment[] | null;
}

export interface Conversation {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  archived_at?: string | null;
  system_prompt?: string | null;
  model_name?: string | null;
  last_message?: string;
  message_count?: number;
}

export interface StarredItem {
  star_id: string;
  starred_at: string;
  message_id: string;
  content: string;
  message_created_at: string;
  role: string;
  model_name?: string;
  conversation_id: string;
  conversation_title: string;
}

export interface GeneratedImage {
  id: string;
  prompt: string;
  image_reference: string;
  aspect_ratio: string;
  created_at: string;
  generation_status: string;
  base64Preview?: string;
}

export interface UserPreferences {
  theme: 'dark' | 'light';
  preferred_language: string;
  voice_enabled: number;
  voice_name: string;
  system_prompt: string;
  web_search_enabled: number;
  updated_at?: string;
}

export interface UserMemory {
  id: string;
  memory_content: string;
  created_at: string;
  updated_at: string;
}

export type ActiveWorkspace = 
  | 'chat'
  | 'images'
  | 'translator'
  | 'documents'
  | 'memory'
  | 'starred';
