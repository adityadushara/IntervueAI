export type ExperienceLevel = 'junior' | 'mid' | 'senior' | 'lead';

export type InterviewType = 'technical' | 'behavioral' | 'system_design' | 'mixed';

export type InterviewDifficulty = 'easy' | 'medium' | 'hard';

export interface InterviewConfig {
  candidateName: string;
  role: string;
  customRole?: string;
  level: ExperienceLevel;
  interviewType: InterviewType;
  difficulty: InterviewDifficulty;
  topics: string[];
  questionCount: number;
}

export interface InterviewQuestion {
  id: string;
  questionNumber: number;
  text: string;
  category: string;
  context?: string;
  sampleHints?: string[];
  expectedKeywords?: string[];
}

export interface CandidateAnswer {
  questionId: string;
  questionText: string;
  answerText: string;
  timeSpentSeconds: number;
  submittedAt: string;
  feedbackSnippet?: string;
}

export interface InterviewScore {
  overall: number; // 0 - 100
  communication: number; // 0 - 100
  technicalDepth: number; // 0 - 100
  problemSolving: number; // 0 - 100
  summary: string;
  strengths: string[];
  improvements: string[];
}

export interface InterviewSession {
  id: string;
  config: InterviewConfig;
  status: 'in_progress' | 'completed' | 'abandoned';
  createdAt: string;
  completedAt?: string;
  totalTimeSeconds: number;
  questions: InterviewQuestion[];
  answers: CandidateAnswer[];
  currentQuestionIndex: number;
  score?: InterviewScore;
}

export interface FormValidationErrors {
  candidateName?: string;
  role?: string;
  customRole?: string;
  topics?: string;
}
