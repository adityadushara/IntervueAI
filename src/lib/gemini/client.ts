import { GoogleGenAI } from '@google/genai';

/**
 * Server-only Gemini Client and Resilience Module.
 * 
 * Security Controls:
 * 1. Server-side only: Never executes or exposes keys in browser bundles.
 * 2. Key security: Reads GEMINI_API_KEY from environment variables.
 * 3. Transient error resilience: Implements exponential backoff on 503 / 429.
 * 4. Model fallback: Automatically switches between compatible flash models if a model experiences high demand.
 * 5. Structured JSON parser: Safely parses model output with markdown fence stripping.
 */

let geminiClient: GoogleGenAI | null = null;

// Track usage tokens across server session for cost / rate control
export interface GeminiUsageMetrics {
  totalCalls: number;
  successfulCalls: number;
  failedCalls: number;
  fallbackCalls: number;
  estimatedPromptTokens: number;
  estimatedCandidateTokens: number;
}

export const serverGeminiUsage: GeminiUsageMetrics = {
  totalCalls: 0,
  successfulCalls: 0,
  failedCalls: 0,
  fallbackCalls: 0,
  estimatedPromptTokens: 0,
  estimatedCandidateTokens: 0,
};

export function isGeminiConfigured(): boolean {
  if (typeof window !== 'undefined') return false;
  return Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim().length > 0);
}

export function getGeminiModelName(): string {
  return process.env.GEMINI_MODEL || 'gemini-3.5-flash';
}

export function getGeminiClient(): GoogleGenAI | null {
  if (typeof window !== 'undefined') {
    console.error('CRITICAL SECURITY: getGeminiClient() invoked in browser context.');
    return null;
  }

  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) return null;

  if (!geminiClient) {
    geminiClient = new GoogleGenAI({ apiKey });
  }

  return geminiClient;
}

export interface GenerateOptions {
  model?: string;
  temperature?: number;
  responseMimeType?: string;
  timeoutMs?: number;
  maxRetries?: number;
  systemInstruction?: string;
}

export interface GeminiResponse<T = unknown> {
  success: boolean;
  text: string;
  data?: T;
  modelUsed: string;
  error?: string;
  fallbackUsed: boolean;
}

/**
 * Executes a resilient generation call with retries and model fallbacks.
 */
export async function generateWithResilience<T = unknown>(
  contents: string,
  options: GenerateOptions = {}
): Promise<GeminiResponse<T>> {
  if (typeof window !== 'undefined') {
    throw new Error('Gemini API calls are restricted to server-side execution.');
  }

  const client = getGeminiClient();
  if (!client) {
    return {
      success: false,
      text: '',
      modelUsed: 'none',
      error: 'GEMINI_API_KEY is not configured on server.',
      fallbackUsed: false,
    };
  }

  const primaryModel = options.model || getGeminiModelName();
  // Candidate models in preference order
  const candidateModels = Array.from(new Set([
    primaryModel,
    'gemini-3.1-flash-lite',
    'gemini-3.5-flash',
    'gemini-3.8-flash',
    'gemini-2.5-flash-lite',
  ]));

  const maxRetries = options.maxRetries ?? 2;
  const timeoutMs = options.timeoutMs ?? 20000;
  const responseMimeType = options.responseMimeType || 'application/json';

  serverGeminiUsage.totalCalls++;

  let lastError: Error | null = null;
  let fallbackUsed = false;

  for (let mIdx = 0; mIdx < candidateModels.length; mIdx++) {
    const currentModel = candidateModels[mIdx];
    if (mIdx > 0) {
      fallbackUsed = true;
      serverGeminiUsage.fallbackCalls++;
    }

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error(`Gemini request timed out after ${timeoutMs}ms`)), timeoutMs);
        });

        const apiPromise = client.models.generateContent({
          model: currentModel,
          contents,
          config: {
            temperature: options.temperature ?? 0.2,
            responseMimeType,
            systemInstruction: options.systemInstruction,
          },
        });

        const response = await Promise.race([apiPromise, timeoutPromise]);
        const text = response.text || '';

        // Update token estimation
        serverGeminiUsage.successfulCalls++;
        serverGeminiUsage.estimatedPromptTokens += Math.round(contents.length / 4);
        serverGeminiUsage.estimatedCandidateTokens += Math.round(text.length / 4);

        let parsedData: T | undefined = undefined;
        if (responseMimeType === 'application/json') {
          parsedData = parseJsonFromModel<T>(text);
        }

        return {
          success: true,
          text,
          data: parsedData,
          modelUsed: currentModel,
          fallbackUsed,
        };
      } catch (err: unknown) {
        lastError = err instanceof Error ? err : new Error(String(err));
        const status = (err && typeof err === 'object' && 'status' in err) 
          ? (err as { status: number }).status 
          : 0;

        // 503 (Unavailable/Spike) or 429 (Rate Limit): Backoff and retry
        const isTransient = status === 503 || status === 429;
        if (isTransient && attempt < maxRetries) {
          const delay = attempt * 1200;
          await new Promise(r => setTimeout(r, delay));
          continue;
        }

        // If not transient or exhausted retries, break to next candidate model
        break;
      }
    }
  }

  serverGeminiUsage.failedCalls++;
  return {
    success: false,
    text: '',
    modelUsed: candidateModels[0],
    error: lastError?.message || 'Gemini API call failed after retries across candidate models.',
    fallbackUsed,
  };
}

/**
 * Cleans markdown formatting (```json ... ```) and safely parses JSON.
 */
export function parseJsonFromModel<T = unknown>(rawText: string): T {
  let cleaned = rawText.trim();
  // Strip markdown code fences if model returned them
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, '');
    cleaned = cleaned.replace(/\s*```$/, '');
  }

  // Find first { and last } or first [ and last ]
  const firstBrace = cleaned.indexOf('{');
  const firstBracket = cleaned.indexOf('[');
  
  if (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
    const lastBrace = cleaned.lastIndexOf('}');
    if (lastBrace !== -1) {
      cleaned = cleaned.substring(firstBrace, lastBrace + 1);
    }
  } else if (firstBracket !== -1) {
    const lastBracket = cleaned.lastIndexOf(']');
    if (lastBracket !== -1) {
      cleaned = cleaned.substring(firstBracket, lastBracket + 1);
    }
  }

  return JSON.parse(cleaned) as T;
}
