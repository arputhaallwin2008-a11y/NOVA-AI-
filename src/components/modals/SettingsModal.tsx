import React, { useState, useEffect } from 'react';
import {
  X,
  Sparkles,
  Sliders,
  Volume2,
  Globe,
  Trash2,
  Check,
  AlertTriangle,
  User,
  Shield,
  HelpCircle,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.tsx';
import { useTheme } from '../../context/ThemeContext.tsx';
import { api } from '../../services/api.ts';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const VOICES = [
  { id: 'Zephyr', label: 'Zephyr (Warm & Articulate)' },
  { id: 'Kore', label: 'Kore (Calm & Professional)' },
  { id: 'Puck', label: 'Puck (Lively & Conversational)' },
  { id: 'Charon', label: 'Charon (Deep & Resonant)' },
  { id: 'Fenrir', label: 'Fenrir (Crisp & Focused)' },
];

const PRESET_PERSONALITIES = [
  {
    name: 'General Assistant (Default)',
    prompt: 'You are NOVA, an intelligent, articulate, highly capable, and empathetic personal AI assistant. Provide structured, clear, and comprehensive responses.',
  },
  {
    name: 'Staff Software Engineer',
    prompt: 'You are NOVA, a Staff Software Architect. You prioritize clean code, type safety, modular architecture, algorithmic efficiency, and scalable system design. Always write production-ready code with helpful comments.',
  },
  {
    name: 'Academic Research Tutor',
    prompt: 'You are NOVA, an academic research tutor. Explain core concepts step-by-step from first principles, citing key scientific theories, mathematical foundations, and real-world analogies.',
  },
  {
    name: 'Concise & Minimalist',
    prompt: 'You are NOVA. Answer with extreme precision and brevity. No filler, no pleasantries, directly answer with concise bullet points or minimal code.',
  },
];

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const { user, preferences, updatePreferences, updateProfileName, logout } = useAuth();
  const { theme, setTheme } = useTheme();

  const [activeTab, setActiveTab] = useState<'ai' | 'voice' | 'account' | 'privacy'>('ai');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [voiceName, setVoiceName] = useState('Zephyr');
  const [webSearchEnabled, setWebSearchEnabled] = useState(true);
  const [displayName, setDisplayName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  useEffect(() => {
    if (preferences) {
      setSystemPrompt(preferences.system_prompt || '');
      setVoiceName(preferences.voice_name || 'Zephyr');
      setWebSearchEnabled(Boolean(preferences.web_search_enabled));
    }
    if (user) {
      setDisplayName(user.displayName);
    }
  }, [preferences, user, isOpen]);

  if (!isOpen) return null;

  const handleSavePreferences = async () => {
    setIsSaving(true);
    setSavedSuccess(false);

    try {
      await updatePreferences({
        system_prompt: systemPrompt,
        voice_name: voiceName,
        web_search_enabled: webSearchEnabled ? 1 : 0,
        theme,
      });

      if (user && displayName.trim() && displayName !== user.displayName) {
        await updateProfileName(displayName.trim());
      }

      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2500);
    } catch (err) {
      console.error('Failed to save settings:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (
      !confirm(
        'WARNING: Are you sure you want to permanently delete your account and all associated conversations, memories, and images? This action CANNOT be undone.'
      )
    ) {
      return;
    }

    setIsDeletingAccount(true);
    try {
      await api.deleteAccount();
      logout();
      onClose();
    } catch (err: any) {
      alert(err.message || 'Failed to delete account');
      setIsDeletingAccount(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-2xl overflow-hidden rounded-3xl border border-slate-700/80 bg-[#0F172A] shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-violet-600/30 text-violet-400 ring-1 ring-violet-500/30">
              <Sliders className="h-4 w-4" />
            </div>
            <h2 className="text-base font-bold text-white">Platform Settings</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Tab Bar */}
        <div className="flex border-b border-slate-800 px-6 bg-slate-900/50 overflow-x-auto">
          {[
            { id: 'ai', label: 'AI & Personality', icon: Sparkles },
            { id: 'voice', label: 'Voice & Speech', icon: Volume2 },
            { id: 'account', label: 'Profile & Account', icon: User },
            { id: 'privacy', label: 'Privacy & Data', icon: Shield },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 border-b-2 py-3 px-3 text-xs font-semibold transition-all whitespace-nowrap ${
                  active
                    ? 'border-violet-500 text-violet-300'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {activeTab === 'ai' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">
                  Custom AI Personality & System Prompt
                </label>
                <p className="text-xs text-slate-400 mb-2">
                  Define how NOVA behaves, responds, and formats answers across all conversations.
                </p>
                <textarea
                  value={systemPrompt}
                  onChange={(e) => setSystemPrompt(e.target.value)}
                  placeholder="You are NOVA, an articulate AI assistant..."
                  rows={4}
                  className="w-full rounded-xl border border-slate-700 bg-slate-900/90 p-3 text-xs font-mono text-slate-200 focus:border-violet-500 focus:outline-none"
                />
              </div>

              {/* Persona presets */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Quick Personality Presets
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {PRESET_PERSONALITIES.map((preset, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setSystemPrompt(preset.prompt)}
                      className="rounded-xl border border-slate-800 bg-slate-900/60 p-2.5 text-left hover:border-violet-500/50 hover:bg-slate-800/80 transition-all text-xs"
                    >
                      <span className="font-semibold text-slate-200 block mb-0.5">
                        {preset.name}
                      </span>
                      <span className="text-[11px] text-slate-400 line-clamp-1">
                        {preset.prompt}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Web search default toggle */}
              <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/60 p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-950/60 text-cyan-400">
                    <Globe className="h-4 w-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-white block">
                      Google Web Search Grounding by Default
                    </span>
                    <span className="text-[11px] text-slate-400">
                      Include current live web information and citations in responses.
                    </span>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={webSearchEnabled}
                  onChange={(e) => setWebSearchEnabled(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-700 text-violet-600 focus:ring-violet-500"
                />
              </div>
            </div>
          )}

          {activeTab === 'voice' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
                  Assistant Voice Actor (TTS)
                </label>
                <div className="space-y-2">
                  {VOICES.map((v) => (
                    <label
                      key={v.id}
                      className={`flex items-center justify-between rounded-xl border p-3 cursor-pointer transition-all ${
                        voiceName === v.id
                          ? 'border-violet-500 bg-violet-950/30 text-white'
                          : 'border-slate-800 bg-slate-900/60 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      <span className="text-xs font-medium">{v.label}</span>
                      <input
                        type="radio"
                        name="voice"
                        value={v.id}
                        checked={voiceName === v.id}
                        onChange={() => setVoiceName(v.id)}
                        className="text-violet-600 focus:ring-violet-500"
                      />
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'account' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                  Display Name
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-900 py-2 px-3 text-xs sm:text-sm text-white focus:border-violet-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                  Email Address
                </label>
                <input
                  type="text"
                  disabled
                  value={user?.email || ''}
                  className="w-full rounded-xl border border-slate-800 bg-slate-900/50 py-2 px-3 text-xs text-slate-500 cursor-not-allowed"
                />
              </div>

              {/* Danger Zone: Account deletion */}
              <div className="rounded-2xl border border-red-500/30 bg-red-950/20 p-4 mt-6">
                <div className="flex items-center gap-2 text-xs font-bold text-red-300 mb-1">
                  <AlertTriangle className="h-4 w-4 text-red-400" />
                  <span>Permanent Account Deletion</span>
                </div>
                <p className="text-xs text-red-200/80 mb-3 leading-relaxed">
                  Permanently erase your user profile, all chat conversations, personal memories, starred bookmarks, and generated artwork.
                </p>
                <button
                  onClick={handleDeleteAccount}
                  disabled={isDeletingAccount}
                  className="rounded-xl bg-red-600 hover:bg-red-700 px-3 py-1.5 text-xs font-semibold text-white shadow-md transition-colors"
                >
                  {isDeletingAccount ? 'Deleting...' : 'Delete My Account and Data'}
                </button>
              </div>
            </div>
          )}

          {activeTab === 'privacy' && (
            <div className="space-y-4 text-xs text-slate-300 leading-relaxed">
              <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 space-y-2">
                <h4 className="font-bold text-white flex items-center gap-2">
                  <Shield className="h-4 w-4 text-emerald-400" />
                  <span>Privacy & Storage Guarantees</span>
                </h4>
                <p>
                  • Passwords are cryptographically hashed on the server using secure scrypt key derivation.
                </p>
                <p>
                  • Your data is isolated per-user in SQLite with relational foreign key enforcement.
                </p>
                <p>
                  • External model API keys remain securely on the server and are never exposed to browser client bundles.
                </p>
                <p>
                  • Personal Memory is completely transparent: you can view, edit, or purge memories at any time in the Memory Hub.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between border-t border-slate-800 bg-slate-900/80 px-6 py-3.5">
          {savedSuccess && (
            <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-400">
              <Check className="h-4 w-4" />
              <span>Settings saved!</span>
            </div>
          )}
          {!savedSuccess && <div />}

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="rounded-xl px-4 py-2 text-xs font-medium text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
            >
              Close
            </button>
            <button
              onClick={handleSavePreferences}
              disabled={isSaving}
              className="flex items-center gap-1.5 rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-600 px-5 py-2 text-xs font-semibold text-white shadow-md shadow-violet-600/30 hover:scale-102 transition-all"
            >
              <span>{isSaving ? 'Saving...' : 'Save Settings'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
