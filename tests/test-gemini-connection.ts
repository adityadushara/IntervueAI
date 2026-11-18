import * as fs from 'fs';
import * as path from 'path';
import { GoogleGenAI } from '@google/genai';

// Load .env.local
const envLocalPath = path.resolve(process.cwd(), '.env.local');
const nodeProcess = process as unknown as { loadEnvFile?: (path: string) => void };
if (fs.existsSync(envLocalPath) && typeof nodeProcess.loadEnvFile === 'function') {
  nodeProcess.loadEnvFile(envLocalPath);
}

const apiKey = process.env.GEMINI_API_KEY;
const candidateModels = [
  process.env.GEMINI_MODEL || 'gemini-3.8-flash',
  'gemini-3.5-flash',
  'gemini-3.1-flash-lite',
  'gemini-2.5-flash-lite'
];

if (!apiKey) {
  console.error('FAIL: No GEMINI_API_KEY configured');
  process.exit(1);
}

const ai = new GoogleGenAI({ apiKey });

async function generateWithRetry(model: string, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`[Attempt ${attempt}/${retries}] Querying model: ${model}`);
      const response = await ai.models.generateContent({
        model,
        contents: 'Output valid JSON: {"verified": true, "engine": "Gemini AI"}',
        config: { responseMimeType: 'application/json' }
      });
      return response;
    } catch (err: unknown) {
      const isTransient = err && typeof err === 'object' && 'status' in err && (err.status === 503 || err.status === 429);
      if (isTransient && attempt < retries) {
        const delay = attempt * 1500;
        console.warn(`Transient ${err.status} error on ${model}. Retrying in ${delay}ms...`);
        await new Promise(r => setTimeout(r, delay));
      } else {
        throw err;
      }
    }
  }
}

async function verify() {
  let lastError: unknown = null;
  for (const m of candidateModels) {
    try {
      const response = await generateWithRetry(m, 2);
      if (response?.text) {
        console.log(`SUCCESS with model ${m}! Output:`, response.text);
        return;
      }
    } catch (err) {
      console.warn(`Model ${m} unavailable:`, err instanceof Error ? err.message : String(err));
      lastError = err;
    }
  }
  throw lastError || new Error('All candidate models failed');
}

verify().catch(err => {
  console.error('Fatal Gemini verification error:', err);
  process.exit(1);
});
