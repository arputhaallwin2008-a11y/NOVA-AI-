# NOVA AI — Intelligent Personal AI Assistant Platform

NOVA AI is a modern, responsive, full-stack AI assistant platform built with React, TypeScript, Node.js, Express, SQLite, and the Google GenAI SDK (`@google/genai`).

---

## 🌟 Key Features

1. **AI Chat & Deep Reasoning**:
   - Multi-turn conversation history with full context retention.
   - Powered by Gemini 3 (`gemini-3.8-flash`).
   - Server-Sent Events (SSE) streaming for real-time token delivery.
   - Markdown formatting with code syntax highlighting and one-click copy.
   - Automatic conversation title generation from the first user prompt.

2. **Google Web Search Grounding**:
   - Real-time search integration via Gemini tools (`googleSearch`).
   - Displays verifiable citation cards and external links for retrieved facts.

3. **AI Voice & Speech Interaction**:
   - Real-time Speech-to-Text (STT) using Web Speech API with live visual wave pulse.
   - Text-to-Speech (TTS) using `gemini-3.8-flash-lite-tts` (generating high-fidelity 24kHz audio) with browser speech synthesis fallback.
   - Configurable voice actor presets (`Zephyr`, `Kore`, `Puck`, `Charon`, `Fenrir`).

4. **Visual Studio (AI Image Generation)**:
   - Dedicated workspace for text-to-image synthesis using Gemini visual models.
   - Aspect ratio selection: `1:1`, `16:9`, `9:16`, `4:3`.
   - Aesthetic styles: Cinematic, Photorealistic, Cyberpunk, Anime, Minimalist, 3D Render.
   - Gallery of created assets with download, prompt reuse, and persistent image references.

5. **AI Multilingual Translator**:
   - Context-aware translations across English, Tamil, Hindi, Spanish, French, German, Japanese, Chinese, Arabic, Russian, Portuguese, and more.
   - Automatic source language detection and one-click language swapping.
   - Voice pronunciation playback and clipboard copying.

6. **Document Assistant**:
   - Upload text files, Markdown, source code, and PDFs (up to 10MB).
   - Multimodal document analysis and extraction.
   - Instant "Ask Questions in Chat" to converse with document context.

7. **Transparent Personal Memory**:
   - Long-term memory hub across conversations.
   - Users have full transparency and control: view, create, edit, delete, or clear memories.

8. **Starred & Saved Items**:
   - Bookmark individual high-value AI responses.
   - Dedicated library to browse, copy, and jump directly to the original conversation.

9. **Security & Authentication**:
   - Secure email & password authentication with cryptographic `scrypt` hashing.
   - Instant 1-Click Guest Preview for zero-friction evaluation.
   - Relational user isolation in SQLite with foreign keys and cascade deletions.

10. **Custom Personality & Settings**:
    - Configurable system prompt: define NOVA's personality (Software Architect, Academic Tutor, Minimalist, or custom instructions).
    - Dark & Light mode toggle.

---

## 🛠️ Technology Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS, Lucide Icons, Motion.
- **Backend**: Node.js, Express 4.
- **Database**: SQLite with `sql.js` (WebAssembly-powered, disk-synchronized in `data/nova.sqlite`).
- **AI Models**: Google GenAI TypeScript SDK (`@google/genai`).
  - Chat & Reasoning: `gemini-3.8-flash`
  - Text-to-Speech: `gemini-3.8-flash-lite-tts`
  - Image Synthesis: `gemini-3.1-flash-lite-image` / `gemini-nano-banana-2.1`

---

## 🔑 Environment Variables

Configure the following in `.env` (or via the AI Studio Secrets panel):

```bash
# GEMINI_API_KEY: Required for Gemini AI API calls.
GEMINI_API_KEY="your_gemini_api_key_here"

# PORT: Server port (default 3000)
PORT=3000

# SESSION_SECRET: Secret used to sign HMAC authentication session tokens
SESSION_SECRET="nova-ai-super-secret-auth-key-2026"
```

---

## 🚀 Development & Build Commands

```bash
# Install dependencies
npm install

# Start full-stack development server (Express + Vite on port 3000)
npm run dev

# Type check and lint
npm run lint

# Build client production bundle
npm run build

# Start production server
npm start
```

---

## 🔒 Security Architecture

- **API Keys**: Stored exclusively on the server (`process.env.GEMINI_API_KEY`) and never sent to browser bundles.
- **Passwords**: Hashed with a unique 16-byte cryptographically random salt and 64-byte `scrypt` key derivation.
- **Data Isolation**: All database queries enforce user identity checks (`WHERE user_id = ?`).
