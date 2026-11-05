export type SeniorityLevel = 'Junior' | 'Mid-level' | 'Senior' | 'Lead / Staff' | 'Principal';

export type InterviewType = 'Technical' | 'HR' | 'Behavioural' | 'Mixed';

export type InterviewDifficulty = 'Beginner' | 'Intermediate' | 'Advanced';

export type ExpirationOption = '24 hours' | '48 hours' | '7 days';

export type InterviewStatus = 'active' | 'in_progress' | 'completed' | 'expired' | 'revoked';

export interface JobConfiguration {
  jobTitle: string;
  jobDescription: string;
  requiredSkills: string[];
  requiredExperience: string; // e.g. "3-5 years"
  seniorityLevel: SeniorityLevel;
  interviewType: InterviewType;
  difficulty: InterviewDifficulty;
  questionCount: number;
  expectedDurationMinutes: number;
  language: string;
}

export interface LinkConfiguration {
  expiration: ExpirationOption;
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
}

export interface CandidateInfo {
  fullName: string;
  email: string;
  startedAt?: string;
}

export interface RecruiterEvaluation {
  overallAssessment: string;
  technicalCompetency: 'Exceptional' | 'Strong' | 'Satisfactory' | 'Needs Review';
  communicationClarity: 'Clear & Structured' | 'Good' | 'Verbose' | 'Too Brief';
  notableStrengths: string[];
  areasToProbeInLiveRound: string[];
  recommendation: 'Advance to Technical Final' | 'Hold for Review' | 'Schedule Follow-up' | 'Do Not Advance';
  evaluationGeneratedAt: string;
}

export interface InterviewInvitation {
  id: string;
  token: string;
  jobConfig: JobConfiguration;
  linkConfig: LinkConfiguration;
  createdAt: string;
  expiresAt: string;
  status: InterviewStatus;
  candidate?: CandidateInfo;
  questions: InterviewQuestion[];
  answers: CandidateAnswer[];
  completedAt?: string;
  totalDurationSeconds?: number;
  recruiterReport?: RecruiterEvaluation;
}

export interface RecruiterDashboardMetrics {
  totalCreated: number;
  activeLinks: number;
  pendingInterviews: number;
  completedInterviews: number;
  expiredInterviews: number;
}
