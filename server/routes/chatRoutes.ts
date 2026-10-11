import express, { Response } from 'express';
import crypto from 'crypto';
import { getDb, queryAll, queryOne, execute, saveDbSync } from '../db.ts';
import { requireAuth, AuthenticatedRequest } from '../auth.ts';
import {
  generateChatResponseStream,
  generateChatResponse,
  summarizeConversationTitle,
} from '../gemini.ts';

const router = express.Router();

// List user conversations (with search, archive filter)
router.get('/', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { search, archived } = req.query;
    const db = await getDb();
    const userId = req.user!.id;

    let sql = `
      SELECT c.id, c.title, c.created_at, c.updated_at, c.archived_at, c.model_name,
        (SELECT content FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message,
        (SELECT COUNT(*) FROM messages WHERE conversation_id = c.id) as message_count
      FROM conversations c
      WHERE c.user_id = ?
    `;
    const params: any[] = [userId];

    if (archived === 'true') {
      sql += ' AND c.archived_at IS NOT NULL';
    } else {
      sql += ' AND c.archived_at IS NULL';
    }

    if (search && typeof search === 'string' && search.trim()) {
      sql += ' AND (LOWER(c.title) LIKE ? OR c.id IN (SELECT conversation_id FROM messages WHERE LOWER(content) LIKE ?))';
      const term = `%${search.trim().toLowerCase()}%`;
      params.push(term, term);
    }

    sql += ' ORDER BY c.updated_at DESC';

    const conversations = queryAll(db, sql, params);
    res.json({ conversations });
  } catch (err: any) {
    console.error('Error fetching conversations:', err);
    res.status(500).json({ error: 'Failed to fetch conversations.' });
  }
});

// Create new conversation
router.post('/', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { title, systemPrompt, modelName } = req.body;
    const db = await getDb();
    const convId = crypto.randomUUID();
    const now = new Date().toISOString();
    const convTitle = title?.trim() || 'New Conversation';

    execute(
      db,
      'INSERT INTO conversations (id, user_id, title, created_at, updated_at, system_prompt, model_name) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [convId, req.user!.id, convTitle, now, now, systemPrompt || null, modelName || 'gemini-3.8-flash']
    );

    saveDbSync();

    res.status(201).json({
      conversation: {
        id: convId,
        title: convTitle,
        created_at: now,
        updated_at: now,
        archived_at: null,
        system_prompt: systemPrompt || null,
        model_name: modelName || 'gemini-3.8-flash',
      },
    });
  } catch (err: any) {
    console.error('Error creating conversation:', err);
    res.status(500).json({ error: 'Failed to create conversation.' });
  }
});

// Get single conversation and all messages
router.get('/:id', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const convId = req.params.id;
    const db = await getDb();
    const userId = req.user!.id;

    const conv = queryOne(
      db,
      'SELECT id, title, created_at, updated_at, archived_at, system_prompt, model_name FROM conversations WHERE id = ? AND user_id = ?',
      [convId, userId]
    );

    if (!conv) {
      res.status(404).json({ error: 'Conversation not found.' });
      return;
    }

    // Get messages and starred status
    const messages = queryAll(
      db,
      `SELECT m.id, m.role, m.content, m.created_at, m.model_name, m.status, m.grounding_data, m.file_attachments,
        EXISTS(SELECT 1 FROM starred_items s WHERE s.message_id = m.id AND s.user_id = ?) as is_starred
       FROM messages m
       WHERE m.conversation_id = ?
       ORDER BY m.created_at ASC`,
      [userId, convId]
    );

    // Parse grounding_data & file_attachments JSON safely
    const parsedMessages = messages.map(msg => ({
      ...msg,
      is_starred: Boolean(msg.is_starred),
      grounding_data: msg.grounding_data ? JSON.parse(msg.grounding_data) : null,
      file_attachments: msg.file_attachments ? JSON.parse(msg.file_attachments) : null,
    }));

    res.json({
      conversation: conv,
      messages: parsedMessages,
    });
  } catch (err: any) {
    console.error('Error fetching conversation:', err);
    res.status(500).json({ error: 'Failed to fetch conversation.' });
  }
});

// Update conversation (title or archived status)
router.patch('/:id', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const convId = req.params.id;
    const { title, archived } = req.body;
    const db = await getDb();
    const userId = req.user!.id;

    const conv = queryOne(db, 'SELECT id FROM conversations WHERE id = ? AND user_id = ?', [convId, userId]);
    if (!conv) {
      res.status(404).json({ error: 'Conversation not found.' });
      return;
    }

    const now = new Date().toISOString();
    if (title !== undefined) {
      execute(db, 'UPDATE conversations SET title = ?, updated_at = ? WHERE id = ?', [title.trim(), now, convId]);
    }

    if (archived !== undefined) {
      const archivedAt = archived ? now : null;
      execute(db, 'UPDATE conversations SET archived_at = ?, updated_at = ? WHERE id = ?', [archivedAt, now, convId]);
    }

    saveDbSync();
    res.json({ message: 'Conversation updated successfully.' });
  } catch (err: any) {
    console.error('Error updating conversation:', err);
    res.status(500).json({ error: 'Failed to update conversation.' });
  }
});

// Delete conversation
router.delete('/:id', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const convId = req.params.id;
    const db = await getDb();
    const userId = req.user!.id;

    const conv = queryOne(db, 'SELECT id FROM conversations WHERE id = ? AND user_id = ?', [convId, userId]);
    if (!conv) {
      res.status(404).json({ error: 'Conversation not found.' });
      return;
    }

    execute(db, 'DELETE FROM starred_items WHERE message_id IN (SELECT id FROM messages WHERE conversation_id = ?)', [convId]);
    execute(db, 'DELETE FROM messages WHERE conversation_id = ?', [convId]);
    execute(db, 'DELETE FROM conversations WHERE id = ?', [convId]);

    saveDbSync();
    res.json({ message: 'Conversation deleted.' });
  } catch (err: any) {
    console.error('Error deleting conversation:', err);
    res.status(500).json({ error: 'Failed to delete conversation.' });
  }
});

// Clear messages in conversation
router.post('/:id/clear', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const convId = req.params.id;
    const db = await getDb();
    const userId = req.user!.id;

    const conv = queryOne(db, 'SELECT id FROM conversations WHERE id = ? AND user_id = ?', [convId, userId]);
    if (!conv) {
      res.status(404).json({ error: 'Conversation not found.' });
      return;
    }

    execute(db, 'DELETE FROM starred_items WHERE message_id IN (SELECT id FROM messages WHERE conversation_id = ?)', [convId]);
    execute(db, 'DELETE FROM messages WHERE conversation_id = ?', [convId]);
    execute(db, 'UPDATE conversations SET updated_at = ? WHERE id = ?', [new Date().toISOString(), convId]);

    saveDbSync();
    res.json({ message: 'Conversation messages cleared.' });
  } catch (err: any) {
    console.error('Error clearing conversation:', err);
    res.status(500).json({ error: 'Failed to clear conversation.' });
  }
});

// Send message to AI and stream response
router.post('/:id/messages', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const convId = req.params.id;
  const { content, webSearch, attachments, stream = true } = req.body;
  const userId = req.user!.id;

  if (!content || !content.trim()) {
    res.status(400).json({ error: 'Message content cannot be empty.' });
    return;
  }

  try {
    const db = await getDb();
    const conv = queryOne(
      db,
      'SELECT id, title, system_prompt, model_name FROM conversations WHERE id = ? AND user_id = ?',
      [convId, userId]
    );

    if (!conv) {
      res.status(404).json({ error: 'Conversation not found.' });
      return;
    }

    // Fetch user preferences for default web search or custom system prompt
    const userPrefs = queryOne(
      db,
      'SELECT system_prompt, web_search_enabled FROM user_preferences WHERE user_id = ?',
      [userId]
    );

    // Fetch user memories to personalize context
    const memories = queryAll(
      db,
      'SELECT memory_content FROM user_memory WHERE user_id = ? ORDER BY updated_at DESC LIMIT 20',
      [userId]
    ).map(m => m.memory_content);

    const now = new Date().toISOString();
    const userMsgId = crypto.randomUUID();

    // Store user message in DB
    const attachmentsJson = attachments && attachments.length > 0 ? JSON.stringify(attachments) : null;
    execute(
      db,
      'INSERT INTO messages (id, conversation_id, role, content, created_at, model_name, status, file_attachments) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [userMsgId, convId, 'user', content.trim(), now, null, 'completed', attachmentsJson]
    );

    // Check if this was the first message in conversation. If so, generate title asynchronously!
    const msgCountObj = queryOne(db, 'SELECT COUNT(*) as cnt FROM messages WHERE conversation_id = ?', [convId]);
    const isFirstUserMessage = msgCountObj && msgCountObj.cnt === 1;

    // Load full history for context
    const dbMessages = queryAll(
      db,
      'SELECT role, content FROM messages WHERE conversation_id = ? ORDER BY created_at ASC',
      [convId]
    );

    const chatHistory = dbMessages.map(m => ({
      role: m.role as 'user' | 'assistant' | 'system',
      content: m.content,
    }));

    const effectiveSystemPrompt = conv.system_prompt || userPrefs?.system_prompt || undefined;
    const effectiveWebSearch = webSearch !== undefined ? Boolean(webSearch) : Boolean(userPrefs?.web_search_enabled);

    // Set up SSE headers if streaming is requested
    if (stream) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.flushHeaders?.();

      const assistantMsgId = crypto.randomUUID();
      let accumulatedText = '';
      let groundingSources: any[] = [];
      const model = 'gemini-3.8-flash';

      try {
        const { responseStream } = await generateChatResponseStream({
          messages: chatHistory,
          systemPrompt: effectiveSystemPrompt,
          userMemories: memories,
          webSearch: effectiveWebSearch,
          attachments: attachments || [],
        });

        for await (const chunk of responseStream) {
          const chunkText = chunk.text || '';
          if (chunkText) {
            accumulatedText += chunkText;
            res.write(`data: ${JSON.stringify({ type: 'chunk', text: chunkText })}\n\n`);
          }

          // Check for grounding metadata in candidates
          const metadata = chunk.candidates?.[0]?.groundingMetadata;
          if (metadata?.groundingChunks) {
            for (const c of metadata.groundingChunks) {
              if (c.web?.uri && c.web?.title) {
                groundingSources.push({ title: c.web.title, url: c.web.uri });
              }
            }
          }
        }

        // Deduplicate sources
        const uniqueSources = Array.from(new Map(groundingSources.map(s => [s.url, s])).values());
        const groundingJson = uniqueSources.length > 0 ? JSON.stringify(uniqueSources) : null;
        const completeTime = new Date().toISOString();

        // Save assistant response to DB
        execute(
          db,
          'INSERT INTO messages (id, conversation_id, role, content, created_at, model_name, status, grounding_data) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          [assistantMsgId, convId, 'assistant', accumulatedText, completeTime, model, 'completed', groundingJson]
        );

        // Update conversation updated_at
        execute(db, 'UPDATE conversations SET updated_at = ? WHERE id = ?', [completeTime, convId]);

        // Auto-title if first message
        let newTitle: string | null = null;
        if (isFirstUserMessage && conv.title === 'New Conversation') {
          try {
            newTitle = await summarizeConversationTitle(content.trim());
            execute(db, 'UPDATE conversations SET title = ? WHERE id = ?', [newTitle, convId]);
          } catch (e) {
            console.error('Title generation error:', e);
          }
        }

        saveDbSync();

        res.write(`data: ${JSON.stringify({
          type: 'done',
          messageId: assistantMsgId,
          groundingSources: uniqueSources,
          newTitle: newTitle || undefined,
        })}\n\n`);
        res.end();
      } catch (streamErr: any) {
        console.error('Streaming error:', streamErr);
        let userMessage = streamErr.message || 'AI streaming failed';
        if (userMessage.includes('429') || userMessage.includes('RESOURCE_EXHAUSTED') || userMessage.includes('quota')) {
          userMessage = 'Gemini API Rate Limit / Quota Exceeded (HTTP 429). The model quota is temporarily exhausted. Please wait a moment or attach a paid key in Settings > Secrets.';
        }
        res.write(`data: ${JSON.stringify({ type: 'error', error: userMessage })}\n\n`);
        res.end();
      }
    } else {
      // Non-streaming fallback
      try {
        const { text, groundingSources, model } = await generateChatResponse({
          messages: chatHistory,
          systemPrompt: effectiveSystemPrompt,
          userMemories: memories,
          webSearch: effectiveWebSearch,
          attachments: attachments || [],
        });

        const assistantMsgId = crypto.randomUUID();
        const completeTime = new Date().toISOString();
        const groundingJson = groundingSources.length > 0 ? JSON.stringify(groundingSources) : null;

        execute(
          db,
          'INSERT INTO messages (id, conversation_id, role, content, created_at, model_name, status, grounding_data) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          [assistantMsgId, convId, 'assistant', text, completeTime, model, 'completed', groundingJson]
        );

        execute(db, 'UPDATE conversations SET updated_at = ? WHERE id = ?', [completeTime, convId]);

        let newTitle: string | null = null;
        if (isFirstUserMessage && conv.title === 'New Conversation') {
          try {
            newTitle = await summarizeConversationTitle(content.trim());
            execute(db, 'UPDATE conversations SET title = ? WHERE id = ?', [newTitle, convId]);
          } catch (e) {
            console.error('Title generation error:', e);
          }
        }

        saveDbSync();

        res.json({
          userMessage: {
            id: userMsgId,
            role: 'user',
            content: content.trim(),
            created_at: now,
            file_attachments: attachments || null,
          },
          assistantMessage: {
            id: assistantMsgId,
            role: 'assistant',
            content: text,
            created_at: completeTime,
            model_name: model,
            grounding_data: groundingSources,
          },
          newTitle,
        });
      } catch (err: any) {
        let msg = err.message || 'Failed to process message with AI assistant.';
        if (msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED') || msg.includes('quota')) {
          msg = 'Gemini API Rate Limit / Quota Exceeded (HTTP 429). The model quota is temporarily exhausted. Please wait a moment or attach a paid key in Settings > Secrets.';
        }
        res.status(429).json({ error: msg });
      }
    }
  } catch (err: any) {
    console.error('Error in send message:', err);
    if (!res.headersSent) {
      let msg = err.message || 'Failed to process message with AI assistant.';
      if (msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED') || msg.includes('quota')) {
        msg = 'Gemini API Rate Limit / Quota Exceeded (HTTP 429). Please wait a moment or check your Gemini API quota.';
      }
      res.status(500).json({ error: msg });
    }
  }
});

// Regenerate response for the last assistant message
router.post('/:id/regenerate', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const convId = req.params.id;
  const userId = req.user!.id;
  const { webSearch } = req.body;

  try {
    const db = await getDb();
    const conv = queryOne(
      db,
      'SELECT id, system_prompt, model_name FROM conversations WHERE id = ? AND user_id = ?',
      [convId, userId]
    );

    if (!conv) {
      res.status(404).json({ error: 'Conversation not found.' });
      return;
    }

    // Find the last assistant message and delete it
    const lastMsg = queryOne(
      db,
      'SELECT id, role FROM messages WHERE conversation_id = ? ORDER BY created_at DESC LIMIT 1',
      [convId]
    );

    if (lastMsg && lastMsg.role === 'assistant') {
      execute(db, 'DELETE FROM starred_items WHERE message_id = ?', [lastMsg.id]);
      execute(db, 'DELETE FROM messages WHERE id = ?', [lastMsg.id]);
    }

    // Load remaining history
    const dbMessages = queryAll(
      db,
      'SELECT role, content FROM messages WHERE conversation_id = ? ORDER BY created_at ASC',
      [convId]
    );

    if (dbMessages.length === 0) {
      res.status(400).json({ error: 'No previous user message to regenerate from.' });
      return;
    }

    const userPrefs = queryOne(db, 'SELECT system_prompt, web_search_enabled FROM user_preferences WHERE user_id = ?', [userId]);
    const memories = queryAll(db, 'SELECT memory_content FROM user_memory WHERE user_id = ? ORDER BY updated_at DESC LIMIT 20', [userId]).map(m => m.memory_content);

    const chatHistory = dbMessages.map(m => ({
      role: m.role as 'user' | 'assistant' | 'system',
      content: m.content,
    }));

    const effectiveSystemPrompt = conv.system_prompt || userPrefs?.system_prompt || undefined;
    const effectiveWebSearch = webSearch !== undefined ? Boolean(webSearch) : Boolean(userPrefs?.web_search_enabled);

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    const assistantMsgId = crypto.randomUUID();
    let accumulatedText = '';
    const groundingSources: any[] = [];
    const model = 'gemini-3.8-flash';

    const { responseStream } = await generateChatResponseStream({
      messages: chatHistory,
      systemPrompt: effectiveSystemPrompt,
      userMemories: memories,
      webSearch: effectiveWebSearch,
    });

    for await (const chunk of responseStream) {
      const chunkText = chunk.text || '';
      if (chunkText) {
        accumulatedText += chunkText;
        res.write(`data: ${JSON.stringify({ type: 'chunk', text: chunkText })}\n\n`);
      }
      const metadata = chunk.candidates?.[0]?.groundingMetadata;
      if (metadata?.groundingChunks) {
        for (const c of metadata.groundingChunks) {
          if (c.web?.uri && c.web?.title) {
            groundingSources.push({ title: c.web.title, url: c.web.uri });
          }
        }
      }
    }

    const uniqueSources = Array.from(new Map(groundingSources.map(s => [s.url, s])).values());
    const groundingJson = uniqueSources.length > 0 ? JSON.stringify(uniqueSources) : null;
    const completeTime = new Date().toISOString();

    execute(
      db,
      'INSERT INTO messages (id, conversation_id, role, content, created_at, model_name, status, grounding_data) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [assistantMsgId, convId, 'assistant', accumulatedText, completeTime, model, 'completed', groundingJson]
    );

    execute(db, 'UPDATE conversations SET updated_at = ? WHERE id = ?', [completeTime, convId]);
    saveDbSync();

    res.write(`data: ${JSON.stringify({
      type: 'done',
      messageId: assistantMsgId,
      groundingSources: uniqueSources,
    })}\n\n`);
    res.end();
  } catch (err: any) {
    console.error('Regenerate error:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: err.message || 'Failed to regenerate response.' });
    } else {
      res.write(`data: ${JSON.stringify({ type: 'error', error: err.message })}\n\n`);
      res.end();
    }
  }
});

export default router;
