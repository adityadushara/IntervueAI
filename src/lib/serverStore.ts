import { InterviewInvitation } from '@/types/interview';
import { SEEDED_RECRUITER_INTERVIEWS } from '@/lib/storage';
import fs from 'fs';
import path from 'path';

// Use a local JSON file in a .data directory for server-side persistence across browser sessions
const DATA_DIR = path.join(process.cwd(), '.data');
const DATA_FILE = path.join(DATA_DIR, 'interviews.json');

function ensureDataFile() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(DATA_FILE)) {
      fs.writeFileSync(DATA_FILE, JSON.stringify(SEEDED_RECRUITER_INTERVIEWS, null, 2), 'utf-8');
    }
  } catch (e) {
    console.error('Error ensuring data file:', e);
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
        fs.writeFileSync(DATA_FILE, JSON.stringify(checked, null, 2), 'utf-8');
      }

      return checked;
    }
  } catch (e) {
    console.error('Error reading server data file:', e);
  }
  return SEEDED_RECRUITER_INTERVIEWS;
}

export function saveServerInterviews(interviews: InterviewInvitation[]): void {
  ensureDataFile();
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(interviews, null, 2), 'utf-8');
  } catch (e) {
    console.error('Error writing server data file:', e);
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
