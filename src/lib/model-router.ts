/**
 * Model Router — Unified LLM interface for all agents
 * Supports: Claude (Anthropic), Gemini (Google), DeepSeek, GPT-4o (OpenAI)
 */

import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';

// ── Provider enum ─────────────────────────────────────────────────────────────
export enum ModelProvider {
    CLAUDE = 'CLAUDE',
    GEMINI = 'GEMINI',
    DEEPSEEK = 'DEEPSEEK',
    GPT4O = 'GPT4O',
    OLLAMA = 'OLLAMA',
}

// ── Message types ─────────────────────────────────────────────────────────────
export interface ChatMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

// ── Config ────────────────────────────────────────────────────────────────────
export interface ModelConfig {
    provider: ModelProvider;
    model?: string;           // override default model for provider
    temperature?: number;     // 0.0 – 1.0
    maxTokens?: number;
    apiKey?: string;          // falls back to env var if not set
    baseUrl?: string;         // for Ollama / self-hosted
}

// ── Default models per provider ───────────────────────────────────────────────
const DEFAULT_MODELS: Record<ModelProvider, string> = {
    [ModelProvider.CLAUDE]: 'claude-3-5-sonnet-20241022',
    [ModelProvider.GEMINI]: 'gemini-2.0-flash',
    [ModelProvider.DEEPSEEK]: 'deepseek-chat',
    [ModelProvider.GPT4O]: 'gpt-4o',
    [ModelProvider.OLLAMA]: 'llama3',
};

// ── Model catalogs (used by UI for per-provider selectors) ────────────────────
export interface ModelOption {
    value: string;
    label: string;
    free?: boolean;   // available on free tier
}

export const MODEL_CATALOG: Record<ModelProvider, ModelOption[]> = {
    [ModelProvider.GEMINI]: [
        { value: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash', free: true },
        { value: 'gemini-2.0-flash-lite', label: 'Gemini 2.0 Flash Lite', free: true },
        { value: 'gemini-2.5-flash-lite', label: 'Gemini 2.5 Flash Lite', free: true },
        { value: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash', free: true },
        { value: 'gemini-1.5-flash-8b', label: 'Gemini 1.5 Flash 8B', free: true },
        { value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro', free: false },
    ],
    [ModelProvider.CLAUDE]: [
        { value: 'claude-3-5-sonnet-20241022', label: 'Claude 3.5 Sonnet' },
        { value: 'claude-3-5-haiku-20241022', label: 'Claude 3.5 Haiku' },
        { value: 'claude-3-opus-20240229', label: 'Claude 3 Opus' },
    ],
    [ModelProvider.DEEPSEEK]: [
        { value: 'deepseek-chat', label: 'DeepSeek Chat (V3)' },
        { value: 'deepseek-reasoner', label: 'DeepSeek Reasoner (R1)' },
    ],
    [ModelProvider.GPT4O]: [
        { value: 'gpt-4o', label: 'GPT-4o' },
        { value: 'gpt-4o-mini', label: 'GPT-4o Mini' },
        { value: 'o1-mini', label: 'o1 Mini' },
    ],
    [ModelProvider.OLLAMA]: [
        { value: 'qwen2.5:3b', label: 'Qwen 2.5 3B (Local)' },
        { value: 'llama3', label: 'Llama 3' },
        { value: 'llama3.1', label: 'Llama 3.1' },
        { value: 'mistral', label: 'Mistral' },
        { value: 'qwen2.5-coder', label: 'Qwen 2.5 Coder' },
    ],
};

// ── Response type ─────────────────────────────────────────────────────────────
export interface ModelResponse {
    content: string;
    provider: ModelProvider;
    model: string;
    usage?: {
        inputTokens?: number;
        outputTokens?: number;
    };
}

// ── Main router function ──────────────────────────────────────────────────────
export async function callModel(
    config: ModelConfig,
    messages: ChatMessage[]
): Promise<ModelResponse> {
    const model = config.model ?? DEFAULT_MODELS[config.provider];
    const temperature = config.temperature ?? 0.7;
    const maxTokens = config.maxTokens ?? 8192;

    switch (config.provider) {
        case ModelProvider.CLAUDE:
            return callClaude(config, messages, model, temperature, maxTokens);

        case ModelProvider.GEMINI:
            return callGemini(config, messages, model, temperature, maxTokens);

        case ModelProvider.DEEPSEEK:
            return callOpenAICompatible(config, messages, model, temperature, maxTokens, {
                baseURL: 'https://api.deepseek.com/v1',
                envKeyName: 'DEEPSEEK_API_KEY',
                providerEnum: ModelProvider.DEEPSEEK,
            });

        case ModelProvider.GPT4O:
            return callOpenAICompatible(config, messages, model, temperature, maxTokens, {
                baseURL: undefined,
                envKeyName: 'OPENAI_API_KEY',
                providerEnum: ModelProvider.GPT4O,
            });

        case ModelProvider.OLLAMA:
            return callOpenAICompatible(config, messages, model, temperature, maxTokens, {
                baseURL: config.baseUrl ?? 'https://ollama.version.vn/v1',
                envKeyName: 'OLLAMA_API_KEY',
                providerEnum: ModelProvider.OLLAMA,
            });

        default:
            throw new Error(`Unknown model provider: ${config.provider}`);
    }
}

// ── Claude ────────────────────────────────────────────────────────────────────
async function callClaude(
    config: ModelConfig,
    messages: ChatMessage[],
    model: string,
    temperature: number,
    maxTokens: number
): Promise<ModelResponse> {
    const apiKey = config.apiKey ?? process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error('ANTHROPIC_API_KEY not set');

    const client = new Anthropic({ apiKey });

    // Claude separates system from user/assistant messages
    const systemMsg = messages.find(m => m.role === 'system')?.content ?? '';
    const chatMessages = messages
        .filter(m => m.role !== 'system')
        .map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }));

    const response = await client.messages.create({
        model,
        max_tokens: maxTokens,
        temperature,
        system: systemMsg,
        messages: chatMessages,
    });

    const textBlock = response.content.find(b => b.type === 'text');
    return {
        content: textBlock?.type === 'text' ? textBlock.text : '',
        provider: ModelProvider.CLAUDE,
        model,
        usage: {
            inputTokens: response.usage.input_tokens,
            outputTokens: response.usage.output_tokens,
        },
    };
}

// ── Gemini ────────────────────────────────────────────────────────────────────
async function callGemini(
    config: ModelConfig,
    messages: ChatMessage[],
    model: string,
    temperature: number,
    maxTokens: number
): Promise<ModelResponse> {
    const apiKey = config.apiKey ?? process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error('GEMINI_API_KEY not set');

    const genAI = new GoogleGenerativeAI(apiKey);
    const geminiModel = genAI.getGenerativeModel({
        model,
        generationConfig: { temperature, maxOutputTokens: maxTokens },
    });

    // Build prompt: combine system + user messages into a single chat history
    const systemMsg = messages.find(m => m.role === 'system')?.content;
    const history = messages
        .filter(m => m.role !== 'system')
        .slice(0, -1)  // all but last
        .map(m => ({
            role: m.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: m.content }],
        }));

    const lastUserMsg = messages.filter(m => m.role !== 'system').at(-1)?.content ?? '';
    const fullPrompt = systemMsg ? `${systemMsg}\n\n${lastUserMsg}` : lastUserMsg;

    const chat = geminiModel.startChat({ history });
    const result = await chat.sendMessage(fullPrompt);
    const text = result.response.text();

    return {
        content: text,
        provider: ModelProvider.GEMINI,
        model,
        usage: {
            inputTokens: result.response.usageMetadata?.promptTokenCount,
            outputTokens: result.response.usageMetadata?.candidatesTokenCount,
        },
    };
}

// ── OpenAI-compatible (GPT-4o, DeepSeek, Ollama) ─────────────────────────────
async function callOpenAICompatible(
    config: ModelConfig,
    messages: ChatMessage[],
    model: string,
    temperature: number,
    maxTokens: number,
    opts: { baseURL?: string; envKeyName: string; providerEnum: ModelProvider }
): Promise<ModelResponse> {
    const apiKey = config.apiKey ?? process.env[opts.envKeyName] ?? 'ollama';

    const client = new OpenAI({
        apiKey,
        ...(opts.baseURL ? { baseURL: opts.baseURL } : {}),
    });

    const response = await client.chat.completions.create({
        model,
        temperature,
        max_tokens: maxTokens,
        messages: messages.map(m => ({ role: m.role, content: m.content })),
    });

    return {
        content: response.choices[0]?.message?.content ?? '',
        provider: opts.providerEnum,
        model,
        usage: {
            inputTokens: response.usage?.prompt_tokens,
            outputTokens: response.usage?.completion_tokens,
        },
    };
}

// ── Helper: build config from env for a given provider ───────────────────────
export function getModelConfigFromEnv(
    provider?: ModelProvider
): ModelConfig {
    const activeProvider =
        provider ??
        (process.env.ACTIVE_MODEL as ModelProvider) ??
        ModelProvider.CLAUDE;

    return { provider: activeProvider };
}
