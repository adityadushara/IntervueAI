import { JobConfiguration, StructuredInterviewPlan, InterviewQuestion } from '@/types/interview';
import { generateWithResilience, isGeminiConfigured } from './client';
import { generateQuestionsForJob as generateFallbackQuestions } from '../mockData';

/**
 * Analyzes a job specification and generates a structured interview plan using Gemini AI.
 * 
 * Prompt Injection Safeguards:
 * - Untrusted fields (jobTitle, jobDescription, requiredSkills) are wrapped in XML delimiters.
 * - System instructions strictly demand JSON conforming to the schema.
 */
export async function analyzeJobDescriptionWithGemini(
  jobConfig: JobConfiguration
): Promise<{ plan: StructuredInterviewPlan; questions: InterviewQuestion[]; isAiGenerated: boolean }> {
  // If Gemini is not configured, fall back gracefully to categorized deterministic questions
  if (!isGeminiConfigured()) {
    return generateDeterministicFallbackPlan(jobConfig);
  }

  const skillsText = Array.isArray(jobConfig.requiredSkills)
    ? jobConfig.requiredSkills.join(', ')
    : (typeof jobConfig.requiredSkills === 'string' ? jobConfig.requiredSkills : 'Core technical competencies');

  const prompt = `You are an expert technical recruiter and assessment architect.
Analyze the provided job specification and generate a comprehensive, structured interview plan and a set of ${jobConfig.questionCount || 5} interview questions.

<job_specification>
Job Title: ${jobConfig.jobTitle || 'Software Engineer'}
Company: ${jobConfig.companyName || 'Hiring Organization'}
Seniority: ${jobConfig.seniorityLevel || 'Mid-level'}
Experience: ${jobConfig.requiredExperience || '3+ years'}
Interview Type: ${jobConfig.interviewType || 'Technical'}
Difficulty: ${jobConfig.difficulty || 'Intermediate'}
Target Question Count: ${jobConfig.questionCount || 5}
Expected Duration: ${jobConfig.expectedDurationMinutes || 30} minutes
Language: ${jobConfig.language || 'English'}
Required Skills: ${skillsText}
Job Description:
${jobConfig.jobDescription}
</job_specification>

Generate a JSON object conforming strictly to the following TypeScript interface:
{
  "competencyCategories": string[], // 3 to 5 core competency areas (e.g. "System Architecture & Scalability", "State Management & React Internals", "Concurrency & Reliability")
  "relevantSkills": string[], // Key skills evaluated across the plan
  "questionDistribution": Record<string, number>, // e.g. {"System Architecture": 3, "Database Design": 2}
  "difficultyProgression": string[], // Step-by-step difficulty ladder (e.g. ["Foundational Concepts", "Intermediate Trade-offs", "Advanced Production Troubleshooting"])
  "expectedEvaluationCriteria": string[], // What a strong candidate demonstrates
  "interviewStructureSummary": string, // Overview summary of the interview format
  "questions": [
    {
      "questionNumber": number,
      "text": string, // Professional, realistic technical question
      "category": string, // Must match one of the competencyCategories
      "context": string, // Background or scenario context for the interviewer
      "sampleHints": string[] // 2 to 3 hints or follow-up probe areas
    }
  ]
}

Ensure the questions:
- Are specifically tailored to ${jobConfig.seniorityLevel} ${jobConfig.jobTitle}.
- Test deep practical trade-offs rather than trivia.
- Exactly equal ${jobConfig.questionCount} questions numbered 1 to ${jobConfig.questionCount}.
`;

  try {
    const result = await generateWithResilience<{
      competencyCategories: string[];
      relevantSkills: string[];
      questionDistribution: Record<string, number>;
      difficultyProgression: string[];
      expectedEvaluationCriteria: string[];
      interviewStructureSummary: string;
      questions: Array<{
        questionNumber: number;
        text: string;
        category: string;
        context?: string;
        sampleHints?: string[];
      }>;
    }>(prompt, {
      temperature: 0.2,
      responseMimeType: 'application/json',
      systemInstruction: 'You are an enterprise technical assessment engine. Output only strictly valid JSON matching the requested schema.',
    });

    if (result.success && result.data && Array.isArray(result.data.questions) && result.data.questions.length > 0) {
      const parsed = result.data;
      const formattedQuestions: InterviewQuestion[] = parsed.questions.map((q, idx) => ({
        id: `q-gemini-${idx + 1}-${Math.random().toString(36).substring(2, 7)}`,
        questionNumber: q.questionNumber || idx + 1,
        text: q.text,
        category: q.category || 'Core Technical',
        context: q.context,
        sampleHints: Array.isArray(q.sampleHints) ? q.sampleHints : [],
      }));

      const plan: StructuredInterviewPlan = {
        competencyCategories: parsed.competencyCategories || [jobConfig.interviewType],
        relevantSkills: parsed.relevantSkills || jobConfig.requiredSkills,
        questionDistribution: parsed.questionDistribution || { 'Core Technical': formattedQuestions.length },
        difficultyProgression: parsed.difficultyProgression || ['Foundational', 'Intermediate', 'Advanced'],
        expectedEvaluationCriteria: parsed.expectedEvaluationCriteria || [
          'Practical trade-off articulation',
          'Production debugging experience',
          'Clean structural reasoning'
        ],
        interviewStructureSummary: parsed.interviewStructureSummary || 
          `${jobConfig.questionCount} question assessment tailored for ${jobConfig.seniorityLevel} ${jobConfig.jobTitle}.`,
        generatedQuestions: formattedQuestions,
      };

      return {
        plan,
        questions: formattedQuestions,
        isAiGenerated: true,
      };
    }
  } catch (err) {
    console.warn('Gemini job analysis failed, falling back to deterministic plan:', err);
  }

  return generateDeterministicFallbackPlan(jobConfig);
}

/**
 * Fallback generator when Gemini API is unavailable or offline.
 */
function generateDeterministicFallbackPlan(jobConfig: JobConfiguration): {
  plan: StructuredInterviewPlan;
  questions: InterviewQuestion[];
  isAiGenerated: boolean;
} {
  const fallbackQuestions = generateFallbackQuestions(jobConfig);
  const categories = Array.from(new Set(fallbackQuestions.map(q => q.category)));
  
  const distribution: Record<string, number> = {};
  for (const q of fallbackQuestions) {
    distribution[q.category] = (distribution[q.category] || 0) + 1;
  }

  const plan: StructuredInterviewPlan = {
    competencyCategories: categories,
    relevantSkills: jobConfig.requiredSkills,
    questionDistribution: distribution,
    difficultyProgression: [
      'Core Competency Verification',
      'System Architecture & Trade-offs',
      'Production Edge Cases & Resiliency'
    ],
    expectedEvaluationCriteria: [
      'Clarity and structure in technical communication',
      'Depth of hands-on experience with listed skills',
      'Practical understanding of production engineering trade-offs'
    ],
    interviewStructureSummary: `Structured ${jobConfig.interviewType} assessment consisting of ${fallbackQuestions.length} questions across ${categories.length} core domains.`,
    generatedQuestions: fallbackQuestions,
  };

  return {
    plan,
    questions: fallbackQuestions,
    isAiGenerated: false,
  };
}
