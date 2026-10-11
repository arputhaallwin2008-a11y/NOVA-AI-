import { GoogleGenAI } from '@google/genai';

function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

export { getGeminiClient };

export interface ChatMessageParam {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface GroundingSource {
  title: string;
  url: string;
}

export async function generateChatResponse({
  messages,
  systemPrompt,
  userMemories = [],
  webSearch = false,
  attachments = [],
}: {
  messages: ChatMessageParam[];
  systemPrompt?: string;
  userMemories?: string[];
  webSearch?: boolean;
  attachments?: { mimeType: string; data: string; name?: string }[];
}): Promise<{
  text: string;
  groundingSources: GroundingSource[];
  model: string;
}> {
  const ai = getGeminiClient();
  if (!ai) {
    throw new Error('GEMINI_API_KEY is not configured on the server. Please add it to your environment.');
  }

  const model = 'gemini-3.8-flash';

  let completeSystemInstruction = systemPrompt || 
    'You are NOVA, an intelligent, articulate, highly capable, and empathetic personal AI assistant. ' +
    'Provide structured, clear, and comprehensive responses. Use markdown for code blocks, tables, math, lists, and formatting. ' +
    'Help the user with programming, reasoning, writing, planning, mathematics, and learning.';

  if (userMemories.length > 0) {
    completeSystemInstruction += `\n\n[PERSISTENT USER MEMORY]\nThe user has asked you to remember the following facts about them across conversations:\n${userMemories.map((m, i) => `${i + 1}. ${m}`).join('\n')}\nKeep these preferences in mind when tailoring responses.`;
  }

  // Format contents for Gemini
  // Map conversation history
  const contents: any[] = [];

  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    const isLatest = i === messages.length - 1;

    const parts: any[] = [];
    
    // If it is the latest user message and has attachments, add them as inlineData
    if (isLatest && msg.role === 'user' && attachments.length > 0) {
      for (const att of attachments) {
        parts.push({
          inlineData: {
            mimeType: att.mimeType,
            data: att.data,
          },
        });
      }
    }

    parts.push({ text: msg.content });

    contents.push({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts,
    });
  }

  const config: any = {
    systemInstruction: completeSystemInstruction,
  };

  if (webSearch) {
    config.tools = [{ googleSearch: {} }];
  }

  const response = await ai.models.generateContent({
    model,
    contents,
    config,
  });

  const text = response.text || '';
  const groundingSources: GroundingSource[] = [];

  // Extract grounding metadata if webSearch was used
  const metadata = response.candidates?.[0]?.groundingMetadata;
  if (metadata?.groundingChunks) {
    for (const chunk of metadata.groundingChunks) {
      if (chunk.web?.uri && chunk.web?.title) {
        groundingSources.push({
          title: chunk.web.title,
          url: chunk.web.uri,
        });
      }
    }
  }

  return {
    text,
    groundingSources,
    model,
  };
}

export async function generateChatResponseStream({
  messages,
  systemPrompt,
  userMemories = [],
  webSearch = false,
  attachments = [],
}: {
  messages: ChatMessageParam[];
  systemPrompt?: string;
  userMemories?: string[];
  webSearch?: boolean;
  attachments?: { mimeType: string; data: string; name?: string }[];
}) {
  const ai = getGeminiClient();
  if (!ai) {
    throw new Error('GEMINI_API_KEY is not configured on the server. Please add it to your environment.');
  }

  const model = 'gemini-3.8-flash';

  let completeSystemInstruction = systemPrompt || 
    'You are NOVA, an intelligent, articulate, highly capable, and empathetic personal AI assistant. ' +
    'Provide structured, clear, and comprehensive responses. Use markdown for code blocks, tables, math, lists, and formatting. ' +
    'Help the user with programming, reasoning, writing, planning, mathematics, and learning.';

  if (userMemories.length > 0) {
    completeSystemInstruction += `\n\n[PERSISTENT USER MEMORY]\nThe user has asked you to remember the following facts about them across conversations:\n${userMemories.map((m, i) => `${i + 1}. ${m}`).join('\n')}\nKeep these preferences in mind when tailoring responses.`;
  }

  const contents: any[] = [];
  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    const isLatest = i === messages.length - 1;
    const parts: any[] = [];

    if (isLatest && msg.role === 'user' && attachments.length > 0) {
      for (const att of attachments) {
        parts.push({
          inlineData: {
            mimeType: att.mimeType,
            data: att.data,
          },
        });
      }
    }

    parts.push({ text: msg.content });

    contents.push({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts,
    });
  }

  const config: any = {
    systemInstruction: completeSystemInstruction,
  };

  if (webSearch) {
    config.tools = [{ googleSearch: {} }];
  }

  const responseStream = await ai.models.generateContentStream({
    model,
    contents,
    config,
  });

  return { responseStream, model };
}

export async function generateImageWithGemini({
  prompt,
  aspectRatio = '1:1',
  style = 'realistic',
}: {
  prompt: string;
  aspectRatio?: '1:1' | '3:4' | '4:3' | '9:16' | '16:9';
  style?: string;
}): Promise<{ base64Image: string; mimeType: string }> {
  const ai = getGeminiClient();
  if (!ai) {
    throw new Error('GEMINI_API_KEY is not configured on the server. Please add it to your environment.');
  }

  const enhancedPrompt = style && style !== 'none'
    ? `${prompt}, styled in ${style} aesthetic, high detail, masterpiece`
    : prompt;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-lite-image',
      contents: {
        parts: [
          { text: enhancedPrompt },
        ],
      },
      config: {
        imageConfig: {
          aspectRatio,
        },
      },
    });

    const parts = response.candidates?.[0]?.content?.parts || [];
    for (const part of parts) {
      if (part.inlineData && part.inlineData.data) {
        return {
          base64Image: part.inlineData.data,
          mimeType: part.inlineData.mimeType || 'image/png',
        };
      }
    }

    throw new Error('No image returned by the generation model.');
  } catch (err: any) {
    // If nano banana or paid model requires paid key or fails, provide helpful descriptive error
    console.error('Image generation error:', err);
    throw new Error(err.message || 'Image generation failed');
  }
}

export async function translateTextWithGemini({
  text,
  sourceLang,
  targetLang,
}: {
  text: string;
  sourceLang: string;
  targetLang: string;
}): Promise<{
  translatedText: string;
  detectedSourceLang?: string;
}> {
  const ai = getGeminiClient();
  if (!ai) {
    throw new Error('GEMINI_API_KEY is not configured on the server.');
  }

  const prompt = `You are a professional multilingual translator. 
Translate the following text from ${sourceLang === 'auto' ? 'the automatically detected source language' : sourceLang} into ${targetLang}.
Preserve meaning, nuance, tone, and formatting as closely as possible.

Return your response in JSON with the following structure:
{
  "detectedSourceLang": "Language name if source was auto, otherwise the source language",
  "translatedText": "The translated text only"
}

Text to translate:
"""
${text}
"""`;

  const response = await ai.models.generateContent({
    model: 'gemini-3.8-flash',
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
    },
  });

  try {
    const data = JSON.parse(response.text || '{}');
    return {
      translatedText: data.translatedText || response.text || '',
      detectedSourceLang: data.detectedSourceLang || sourceLang,
    };
  } catch {
    return {
      translatedText: response.text || '',
      detectedSourceLang: sourceLang,
    };
  }
}

export async function generateSpeechAudio({
  text,
  voice = 'Zephyr',
}: {
  text: string;
  voice?: string;
}): Promise<{ base64Audio: string; mimeType: string }> {
  const ai = getGeminiClient();
  if (!ai) {
    throw new Error('GEMINI_API_KEY is not configured on the server.');
  }

  const validVoices = ['Puck', 'Charon', 'Kore', 'Fenrir', 'Zephyr'];
  const selectedVoice = validVoices.includes(voice) ? voice : 'Zephyr';

  // Limit text length to prevent huge generation payloads
  const trimmedText = text.slice(0, 1000);

  const response = await ai.models.generateContent({
    model: 'gemini-3.8-flash-lite-tts',
    contents: [
      {
        role: 'user',
        parts: [
          { text: trimmedText },
        ],
      },
    ],
    config: {
      responseModalities: ['AUDIO'],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: selectedVoice },
        },
      },
    },
  });

  const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  if (!base64Audio) {
    throw new Error('No audio output returned by speech model.');
  }

  return {
    base64Audio,
    mimeType: 'audio/wav',
  };
}

export async function summarizeConversationTitle(firstMessage: string): Promise<string> {
  const ai = getGeminiClient();
  if (!ai) {
    return firstMessage.slice(0, 30) + (firstMessage.length > 30 ? '...' : '');
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: `Generate a short, concise 3 to 6 word title for a conversation that starts with: "${firstMessage}". Return ONLY the title, no quotation marks or punctuation.`,
    });
    const title = (response.text || '').trim().replace(/^["']|["']$/g, '');
    return title.slice(0, 50) || 'New Conversation';
  } catch {
    return firstMessage.slice(0, 30) + (firstMessage.length > 30 ? '...' : '');
  }
}
