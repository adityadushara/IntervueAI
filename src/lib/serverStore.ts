import { InterviewInvitation } from '@/types/interview';
import fs from 'fs';
import path from 'path';
import os from 'os';

// Detect serverless environment (e.g. Vercel or AWS Lambda) where process.cwd() is read-only
const isServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
const DATA_DIR = isServerless ? path.join(os.tmpdir(), 'intervue-data') : path.join(process.cwd(), '.data');
const DATA_FILE = path.join(DATA_DIR, 'interviews.json');

// In-memory fallback store to ensure zero crash in serverless environments
let memoryCache: InterviewInvitation[] = [];

function ensureDataFile() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(DATA_FILE)) {
      fs.writeFileSync(DATA_FILE, JSON.stringify(memoryCache, null, 2), 'utf-8');
    }
  } catch (e) {
    // In serverless / read-only contexts, log at debug level and rely on memoryCache
    if (!isServerless) {
      console.warn('Notice: Filesystem data directory could not be initialized, using memory fallback:', e);
    }
  }
}

export function getServerInterviews(): InterviewInvitation[] {
  ensureDataFile();
  try {
    if (fs.existsSync(DATA_FILE)) {
      const content = fs.readFileSync(DATA_FILE, 'utf-8');
      const parsed: InterviewInvitation[] = JSON.parse(content);

      // Flag expired interviews dynamically
      const now = Date.now();
      let changed = false;
      const checked = parsed.map(inv => {
        if (inv.status === 'active' && new Date(inv.expiresAt).getTime() < now) {
          changed = true;
          return { ...inv, status: 'expired' as const };
        }
        return inv;
      });

      if (changed) {
        try {
          fs.writeFileSync(DATA_FILE, JSON.stringify(checked, null, 2), 'utf-8');
        } catch {
          // Ignore write failure in transient serverless
        }
      }

      memoryCache = checked;
      return checked;
    }
  } catch (e) {
    if (!isServerless) {
      console.warn('Notice: Reading data file failed, using memory fallback:', e);
    }
  }
  return memoryCache;
}

export function saveServerInterviews(interviews: InterviewInvitation[]): void {
  memoryCache = [...interviews];
  ensureDataFile();
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(interviews, null, 2), 'utf-8');
  } catch (e) {
    if (!isServerless) {
      console.warn('Notice: Writing data file failed, saved to memory fallback:', e);
    }
  }
}

export function getServerInterviewByToken(token: string): InterviewInvitation | null {
  const interviews = getServerInterviews();
  return interviews.find(i => i.token.trim().toLowerCase() === token.trim().toLowerCase()) || null;
}

export function upsertServerInterview(interview: InterviewInvitation): InterviewInvitation {
  const interviews = getServerInterviews();
  const index = interviews.findIndex(i => i.id === interview.id || i.token.trim().toLowerCase() === interview.token.trim().toLowerCase());
  
  if (index >= 0) {
    interviews[index] = interview;
  } else {
    interviews.unshift(interview);
  }

  saveServerInterviews(interviews);
  return interview;
}

export function updateServerInterviewToken(id: string, newToken: string): void {
  const interviews = getServerInterviews();
  const target = interviews.find(i => i.id === id);
  if (target) {
    target.token = newToken;
    saveServerInterviews(interviews);
  }
}

export function deleteServerInterview(id: string): void {
  const interviews = getServerInterviews();
  const filtered = interviews.filter(i => i.id !== id);
  saveServerInterviews(filtered);
}

export function revokeServerInterview(id: string): void {
  const interviews = getServerInterviews();
  const target = interviews.find(i => i.id === id);
  if (target && target.status !== 'completed') {
    target.status = 'revoked';
    saveServerInterviews(interviews);
  }
}
