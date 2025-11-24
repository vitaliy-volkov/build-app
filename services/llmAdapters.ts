import { GoogleGenAI } from '@google/genai';
import { LLMProvider } from '../types';

export type PromptPart = 
  | { type: 'text'; text: string }
  | { type: 'data'; mimeType: string; data: string };

export type InvocationMode = 'text' | 'image';

export interface LLMInvocation {
  mode: InvocationMode;
  model: string;
  parts: PromptPart[];
  systemInstruction?: string;
  responseFormat?: 'text' | 'json';
}

export interface AdapterContext {
  apiKey?: string;
  baseUrl?: string;
  providerId: LLMProvider;
}

export interface LLMResponse {
  text?: string;
  dataUri?: string;
  raw?: any;
}

export interface LLMAdapter {
  id: LLMProvider;
  supports: {
    text: boolean;
    multimodal?: boolean;
    json?: boolean;
    image?: boolean;
  };
  invoke(ctx: AdapterContext, request: LLMInvocation): Promise<LLMResponse>;
}

const ensureApiKey = (ctx: AdapterContext) => {
  const key = ctx.apiKey || process.env.API_KEY;
  if (!key) {
    throw new Error('Не указан API ключ для выбранного провайдера.');
  }
  return key;
};

const textOnlyPartsToString = (parts: PromptPart[]) => {
  return parts
    .map(part => {
      if (part.type !== 'text') {
        throw new Error('Выбранный провайдер не поддерживает вложения/мультимодальность.');
      }
      return part.text;
    })
    .join('\n\n');
};

const googleAdapter: LLMAdapter = {
  id: 'google',
  supports: { text: true, multimodal: true, json: true, image: true },
  async invoke(ctx, request) {
    const apiKey = ensureApiKey(ctx);
    const client = new GoogleGenAI({ apiKey });
    const parts = request.parts.map(part => part.type === 'text'
      ? { text: part.text }
      : { inlineData: { mimeType: part.mimeType, data: part.data } }
    );

    const response = await client.models.generateContent({
      model: request.model,
      contents: [{ role: 'user', parts }],
      config: {
        systemInstruction: request.systemInstruction,
        responseMimeType: request.responseFormat === 'json' ? 'application/json' : undefined,
      }
    });

    if (request.mode === 'image') {
      const candidate = response.candidates?.[0]?.content?.parts?.find((part: any) => part.inlineData);
      if (candidate?.inlineData) {
        return {
          dataUri: `data:${candidate.inlineData.mimeType};base64,${candidate.inlineData.data}`,
          raw: response
        };
      }
      return { dataUri: undefined, raw: response };
    }

    return {
      text: response.text,
      raw: response
    };
  }
};

const createOpenAICompatibleAdapter = (id: LLMProvider, defaultBaseUrl: string, extraHeaders?: Record<string, string>): LLMAdapter => ({
  id,
  supports: { text: true, json: true },
  async invoke(ctx, request) {
    if (request.mode === 'image') {
      throw new Error(`Провайдер ${id} не поддерживает генерацию изображений.`);
    }
    const apiKey = ensureApiKey(ctx);
    const baseUrl = ctx.baseUrl || defaultBaseUrl;
    const url = `${baseUrl.replace(/\/$/, '')}/chat/completions`;

    const payload: any = {
      model: request.model,
      messages: []
    };

    if (request.systemInstruction) {
      payload.messages.push({ role: 'system', content: request.systemInstruction });
    }

    payload.messages.push({
      role: 'user',
      content: textOnlyPartsToString(request.parts)
    });

    if (request.responseFormat === 'json') {
      payload.response_format = { type: 'json_object' };
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
      ...extraHeaders
    };

    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Ошибка LLM (${id}): ${err}`);
    }

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content;
    const text = Array.isArray(content) ? content.map((item: any) => item.text || item).join('\n') : content;
    return { text, raw: data };
  }
});

const anthropicAdapter: LLMAdapter = {
  id: 'anthropic',
  supports: { text: true, json: true },
  async invoke(ctx, request) {
    if (request.mode === 'image') {
      throw new Error('Anthropic не поддерживает генерацию изображений.');
    }
    const apiKey = ensureApiKey(ctx);
    const baseUrl = ctx.baseUrl || 'https://api.anthropic.com/v1';
    const url = `${baseUrl.replace(/\/$/, '')}/messages`;

    if (request.parts.some(part => part.type !== 'text')) {
      throw new Error('Anthropic Messages API пока не поддерживает вложения в этом интерфейсе.');
    }

    const body: any = {
      model: request.model,
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: textOnlyPartsToString(request.parts)
        }
      ]
    };

    if (request.systemInstruction) {
      body.system = request.systemInstruction;
    }

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(body)
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Ошибка Anthropic: ${err}`);
    }

    const data = await res.json();
    const text = data.content?.map((item: any) => item.text).join('\n');
    return { text, raw: data };
  }
};

const ollamaAdapter: LLMAdapter = {
  id: 'ollama',
  supports: { text: true },
  async invoke(ctx, request) {
    if (request.mode === 'image') {
      throw new Error('Ollama не поддерживает генерацию изображений.');
    }
    const baseUrl = ctx.baseUrl || 'http://localhost:11434';
    if (request.parts.some(part => part.type !== 'text')) {
      throw new Error('Ollama в текущей интеграции поддерживает только текст.');
    }
    const url = `${baseUrl.replace(/\/$/, '')}/api/generate`;

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: request.model,
        prompt: textOnlyPartsToString(request.parts),
        system: request.systemInstruction,
        stream: false
      })
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Ошибка Ollama: ${err}`);
    }

    const data = await res.json();
    return { text: data.response, raw: data };
  }
};

const adapters: Record<LLMProvider, LLMAdapter> = {
  google: googleAdapter,
  openai: createOpenAICompatibleAdapter('openai', 'https://api.openai.com/v1'),
  groq: createOpenAICompatibleAdapter('groq', 'https://api.groq.com/openai/v1'),
  openrouter: createOpenAICompatibleAdapter('openrouter', 'https://openrouter.ai/api/v1', {
    'HTTP-Referer': 'https://localhost',
    'X-Title': 'Stroy-Control'
  }),
  custom: createOpenAICompatibleAdapter('custom', 'https://api.openai.com/v1'),
  anthropic: anthropicAdapter,
  ollama: ollamaAdapter
};

export const getLLMAdapter = (providerId: LLMProvider): LLMAdapter | undefined => adapters[providerId];

