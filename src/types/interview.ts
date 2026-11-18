export type SeniorityLevel = 'Junior' | 'Mid-level' | 'Senior' | 'Lead / Staff' | 'Principal';

export type InterviewType = 'Technical' | 'HR' | 'Behavioural' | 'Mixed';

export type InterviewDifficulty = 'Beginner' | 'Intermediate' | 'Advanced';

export type ExpirationOption = '24 hours' | '48 hours' | '7 days';

export type InterviewStatus = 'active' | 'in_progress' | 'completed' | 'expired' | 'revoked';

export interface StructuredInterviewPlan {
  competencyCategories: string[];
  relevantSkills: string[];
  questionDistribution: Record<string, number>;
  difficultyProgression: string[];
  expectedEvaluationCriteria: string[];
  interviewStructureSummary: string;
  generatedQuestions?: InterviewQuestion[];
}

export interface JobConfiguration {
  companyName: string;
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
  structuredPlan?: StructuredInterviewPlan;
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
  isFollowUp?: boolean;
  parentQuestionId?: string;
}

export interface CandidateAnswer {
  questionId: string;
  questionText: string;
  answerText: string;
  timeSpentSeconds: number;
  submittedAt: string;
  interviewerFeedback?: string;
}

export interface CandidateInfo {
  fullName: string;
  email: string;
  startedAt?: string;
}

export interface CompetencyScorecard {
  score: number; // 0 - 100
  evidence: string[]; // Actual quotes/citations from candidate answers
  strengths: string[];
  weaknesses: string[];
  improvementSuggestions: string[];
}

export interface GeminiDetailedEvaluation {
  overallScore: number; // 0 - 100
  interviewSummary: string;
  competencies: {
    technicalKnowledge: CompetencyScorecard;
    problemSolving: CompetencyScorecard;
    communication: CompetencyScorecard;
    conceptualUnderstanding: CompetencyScorecard;
    practicalReasoning: CompetencyScorecard;
    roleSpecific: CompetencyScorecard;
  };
  strongestAreas: string[];
  weakestAreas: string[];
  suggestedNextSteps: string[];
  hiringRecommendation: 'Strongly Recommend' | 'Recommend' | 'Borderline' | 'Not Recommended';
  recommendationDisclaimer: string; // Advisory statement
}

export type HiringRecommendation = 
  | 'Advance to Technical Final' 
  | 'Hold for Review' 
  | 'Schedule Follow-up' 
  | 'Do Not Advance'
  | 'Strongly Recommend'
  | 'Recommend'
  | 'Borderline'
  | 'Not Recommended';

export type EvaluationStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface RecruiterEvaluation {
  overallAssessment: string;
  technicalCompetency: 'Exceptional' | 'Strong' | 'Satisfactory' | 'Needs Review';
  communicationClarity: 'Clear & Structured' | 'Good' | 'Verbose' | 'Too Brief';
  notableStrengths: string[];
  areasToProbeInLiveRound: string[];
  recommendation: HiringRecommendation;
  evaluationGeneratedAt: string;
  overallScore?: number;
  detailedEvaluation?: GeminiDetailedEvaluation;
  evaluationStatus?: EvaluationStatus;
  evaluationError?: string;
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
  evaluationStatus?: EvaluationStatus;
  evaluationError?: string;
}

export interface RecruiterDashboardMetrics {
  totalCreated: number;
  activeLinks: number;
  pendingInterviews: number;
  completedInterviews: number;
  expiredInterviews: number;
  failedEvaluations?: number;
}
