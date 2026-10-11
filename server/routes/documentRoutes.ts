import express, { Response } from 'express';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { requireAuth, AuthenticatedRequest } from '../auth.ts';
import { getGeminiClient } from '../gemini.ts';

const router = express.Router();
const DOCS_DIR = path.resolve(process.cwd(), 'data', 'uploads', 'docs');

const ALLOWED_MIME_TYPES = [
  'text/plain',
  'text/markdown',
  'text/csv',
  'application/json',
  'application/pdf',
  'text/javascript',
  'text/typescript',
  'text/html',
  'text/css',
];

// Document Upload & Analysis
router.post('/upload', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name, mimeType, base64Data, textContent } = req.body;
    const userId = req.user!.id;

    if (!name) {
      res.status(400).json({ error: 'File name is required.' });
      return;
    }

    const type = mimeType || 'text/plain';
    const isAllowed = ALLOWED_MIME_TYPES.includes(type) || name.endsWith('.txt') || name.endsWith('.md') || name.endsWith('.pdf') || name.endsWith('.json') || name.endsWith('.csv');
    if (!isAllowed) {
      res.status(400).json({
        error: 'Unsupported file type. Please upload a PDF, TXT, Markdown, JSON, or CSV document.',
      });
      return;
    }

    const docId = crypto.randomUUID();
    let extractedText = '';

    if (textContent) {
      extractedText = textContent;
    } else if (base64Data) {
      const buffer = Buffer.from(base64Data, 'base64');
      // Max 10MB limit
      if (buffer.length > 10 * 1024 * 1024) {
        res.status(400).json({ error: 'File size exceeds maximum limit of 10MB.' });
        return;
      }

      // If text/json/markdown/csv, decode directly
      if (type.startsWith('text/') || type === 'application/json') {
        extractedText = buffer.toString('utf-8');
      } else if (type === 'application/pdf') {
        // Use Gemini multimodal document understanding to extract structured text & overview
        const ai = getGeminiClient();
        if (ai) {
          try {
            const extractResponse = await ai.models.generateContent({
              model: 'gemini-3.8-flash',
              contents: [
                {
                  inlineData: {
                    mimeType: 'application/pdf',
                    data: base64Data,
                  },
                },
                {
                  text: 'Extract and summarize the full text and key findings of this PDF document clearly. Provide a structured outline of sections, headings, and key points.',
                },
              ],
            });
            extractedText = extractResponse.text || 'Extracted PDF content processed.';
          } catch (e: any) {
            console.warn('PDF extraction through Gemini failed:', e);
            extractedText = `PDF document "${name}" (${Math.round(buffer.length / 1024)} KB) uploaded successfully.`;
          }
        } else {
          extractedText = `PDF document "${name}" uploaded.`;
        }
      }

      // Save file safely in docs directory for user
      const safeFilename = `${userId}_${docId}_${path.basename(name).replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      const filePath = path.join(DOCS_DIR, safeFilename);
      fs.writeFileSync(filePath, buffer);
    }

    // Generate a quick summary if extractedText is substantial
    let summary = '';
    const ai = getGeminiClient();
    if (ai && extractedText.length > 100) {
      try {
        const sumRes = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: `Provide a concise 2-sentence executive summary of the following document:\n\n${extractedText.slice(0, 4000)}`,
        });
        summary = sumRes.text || '';
      } catch (e) {
        summary = extractedText.slice(0, 200) + '...';
      }
    } else {
      summary = extractedText.slice(0, 200);
    }

    res.status(201).json({
      document: {
        id: docId,
        name,
        mimeType: type,
        size: base64Data ? Math.round(Buffer.from(base64Data, 'base64').length) : (textContent?.length || 0),
        previewText: extractedText.slice(0, 2000),
        totalCharacters: extractedText.length,
        summary,
        base64Data: type === 'application/pdf' ? base64Data : undefined,
      },
      message: 'Document analyzed and ready for questions.',
    });
  } catch (err: any) {
    console.error('Document upload error:', err);
    res.status(500).json({ error: err.message || 'Failed to process document.' });
  }
});

export default router;
