import { 
  JobConfiguration, 
  CandidateInfo, 
  CandidateAnswer, 
  InterviewQuestion, 
  RecruiterEvaluation, 
  GeminiDetailedEvaluation,
  CompetencyScorecard
} from '@/types/interview';
import { generateWithResilience, isGeminiConfigured } from './client';
import { generateRecruiterEvaluation as generateFallbackEvaluation } from '../mockData';

export interface EvaluationInput {
  jobConfig: JobConfiguration;
  candidateInfo: CandidateInfo;
  questions: InterviewQuestion[];
  answers: CandidateAnswer[];
  totalDurationSeconds: number;
}

/**
 * Generates an in-depth, structured AI evaluation across 6 core competencies using Gemini.
 * 
 * Strict Grounding & Anti-Hallucination:
 * - Temperature is locked at 0.1 - 0.2.
 * - System prompt strictly mandates: "Never invent or hallucinate candidate evidence.
 *   Evidence must be verbatim quotes or direct factual summaries of what the candidate actually stated."
 * - Recommendation is explicitly declared advisory with a mandatory legal disclaimer.
 */
export async function evaluateCandidateInterviewWithGemini(
  input: EvaluationInput
): Promise<{ evaluation: RecruiterEvaluation; detailed: GeminiDetailedEvaluation; isAiGenerated: boolean }> {
  const isStrictProduction = 
    process.env.NODE_ENV === 'production' || 
    process.env.ENFORCE_STRICT_EVALUATION === 'true' ||
    process.env.ENFORCE_STRICT_AUTH === 'true';

  if (!isGeminiConfigured()) {
    if (isStrictProduction) {
      throw new Error('Gemini API is not configured. Synthetic fallback evaluations are prohibited in production.');
    }
    return generateFallbackStructuredEvaluation(input);
  }

  if (input.answers.length === 0) {
    if (isStrictProduction) {
      throw new Error('Cannot evaluate candidate interview with 0 submitted answers.');
    }
    return generateFallbackStructuredEvaluation(input);
  }

  // Format Q&A transcript for model
  const transcriptText = input.answers.map((a, idx) => {
    return `[Question ${idx + 1}] (${a.questionId})
Question: ${a.questionText}
Time Spent: ${a.timeSpentSeconds} seconds
Candidate Response:
"${a.answerText}"`;
  }).join('\n\n');

  const prompt = `You are a Principal Engineering Evaluator and Senior Technical Hiring Bar Raiser.
Conduct an objective, structured technical evaluation of the candidate for the ${input.jobConfig.seniorityLevel} ${input.jobConfig.jobTitle} position.

<role_context>
Role: ${input.jobConfig.seniorityLevel} ${input.jobConfig.jobTitle}
Company: ${input.jobConfig.companyName}
Required Skills: ${input.jobConfig.requiredSkills.join(', ')}
Seniority: ${input.jobConfig.seniorityLevel} (${input.jobConfig.requiredExperience})
Interview Type: ${input.jobConfig.interviewType} (Target Difficulty: ${input.jobConfig.difficulty})
Total Questions Answered: ${input.answers.length}
Total Duration: ${Math.round(input.totalDurationSeconds / 60)} minutes
Candidate Name: ${input.candidateInfo.fullName}
</role_context>

<interview_transcript>
${transcriptText}
</interview_transcript>

EVALUATION RULES:
1. Evaluate all 6 competencies objectively.
2. For EVERY competency, provide a score from 0 to 100 based strictly on the ${input.jobConfig.seniorityLevel} expectations.
3. GROUNDING REQUIREMENT: Under "evidence", provide actual quotes or direct specific facts cited by the candidate in the transcript. NEVER INVENT evidence or claim the candidate said something not in the transcript.
4. If a competency was not tested or had insufficient answer depth, score it conservatively and note that under weaknesses.
5. Provide a clear advisory hiring recommendation:
   - "Strongly Recommend": Exceeds seniority bar with deep trade-off awareness and flawless clarity.
   - "Recommend": Meets seniority bar with solid reasoning and practical competence.
   - "Borderline": Partially meets bar; notable gaps or inconsistencies requiring further technical probing.
   - "Not Recommended": Significant technical gaps or inability to articulate core concepts for this seniority.

Output JSON matching this exact structure:
{
  "overallScore": number, // 0 - 100
  "interviewSummary": string, // 2 to 3 paragraph executive summary of technical performance
  "competencies": {
    "technicalKnowledge": {
      "score": number, // 0-100
      "evidence": string[], // Direct quotes or cited examples from transcript
      "strengths": string[],
      "weaknesses": string[],
      "improvementSuggestions": string[]
    },
    "problemSolving": {
      "score": number,
      "evidence": string[],
      "strengths": string[],
      "weaknesses": string[],
      "improvementSuggestions": string[]
    },
    "communication": {
      "score": number,
      "evidence": string[],
      "strengths": string[],
      "weaknesses": string[],
      "improvementSuggestions": string[]
    },
    "conceptualUnderstanding": {
      "score": number,
      "evidence": string[],
      "strengths": string[],
      "weaknesses": string[],
      "improvementSuggestions": string[]
    },
    "practicalReasoning": {
      "score": number,
      "evidence": string[],
      "strengths": string[],
      "weaknesses": string[],
      "improvementSuggestions": string[]
    },
    "roleSpecific": {
      "score": number,
      "evidence": string[],
      "strengths": string[],
      "weaknesses": string[],
      "improvementSuggestions": string[]
    }
  },
  "strongestAreas": string[], // Top 3 candidate strengths
  "weakestAreas": string[], // Top 2-3 areas needing development
  "suggestedNextSteps": string[], // Actionable study or interview follow-ups
  "hiringRecommendation": "Strongly Recommend" | "Recommend" | "Borderline" | "Not Recommended"
}
`;

  try {
    const result = await generateWithResilience<GeminiDetailedEvaluation>(prompt, {
      temperature: 0.15,
      responseMimeType: 'application/json',
      systemInstruction: 'You are an objective assessment evaluator. Output strict JSON. Strictly ground all evidence in the transcript. Do not hallucinate.',
    });

    if (result.success && result.data && result.data.competencies) {
      const data = result.data;
      const rec = data.hiringRecommendation || 'Recommend';
      const avgScore = data.overallScore ?? 75;
      let techComp: RecruiterEvaluation['technicalCompetency'] = 'Strong';
      if (avgScore >= 85) techComp = 'Exceptional';
      else if (avgScore >= 65) techComp = 'Strong';
      else if (avgScore >= 50) techComp = 'Satisfactory';
      else techComp = 'Needs Review';

      const commScore = data.competencies.communication?.score ?? 75;
      let commClarity: RecruiterEvaluation['communicationClarity'] = 'Clear & Structured';
      if (commScore >= 80) commClarity = 'Clear & Structured';
      else if (commScore >= 65) commClarity = 'Good';
      else commClarity = 'Too Brief';

      const detailed: GeminiDetailedEvaluation = {
        ...data,
        recommendationDisclaimer: 'Advisory evaluation report generated by Gemini AI. Final hiring decisions must be reviewed by the recruiting team.',
      };

      const recruiterEval: RecruiterEvaluation = {
        overallAssessment: data.interviewSummary,
        technicalCompetency: techComp,
        communicationClarity: commClarity,
        notableStrengths: data.strongestAreas || [],
        areasToProbeInLiveRound: data.weakestAreas || [],
        recommendation: rec, // Uses modern advisory recommendation
        evaluationGeneratedAt: new Date().toISOString(),
        overallScore: avgScore,
        detailedEvaluation: detailed,
        evaluationStatus: 'completed',
      };

      return {
        evaluation: recruiterEval,
        detailed,
        isAiGenerated: true,
      };
    }

    if (isStrictProduction) {
      throw new Error('Gemini API returned an incomplete or invalid evaluation structure in strict production mode.');
    }
  } catch (err) {
    console.warn('Gemini evaluation generation failed:', err);
    if (isStrictProduction) {
      // Re-throw in production so callers NEVER fall back to synthetic mock evaluations
      throw err;
    }
  }

  return generateFallbackStructuredEvaluation(input);
}

/**
 * Fallback generator when Gemini API is unavailable or offline.
 */
function generateFallbackStructuredEvaluation(input: EvaluationInput): {
  evaluation: RecruiterEvaluation;
  detailed: GeminiDetailedEvaluation;
  isAiGenerated: boolean;
} {
  const fallback = generateFallbackEvaluation(
    input.jobConfig,
    input.candidateInfo.fullName,
    input.answers
  );

  const fallbackScore = fallback.technicalCompetency === 'Exceptional' ? 90 :
                        fallback.technicalCompetency === 'Strong' ? 78 :
                        fallback.technicalCompetency === 'Satisfactory' ? 62 : 45;

  const buildMockScorecard = (score: number, focus: string): CompetencyScorecard => ({
    score,
    evidence: input.answers.slice(0, 2).map(a => `Demonstrated ${focus} in response to: "${a.questionText.substring(0, 60)}..."`),
    strengths: [`Standard baseline demonstrated for ${focus}`],
    weaknesses: [`Additional live technical probing recommended`],
    improvementSuggestions: [`Review advanced architecture patterns in production`],
  });

  const detailed: GeminiDetailedEvaluation = {
    overallScore: fallbackScore,
    interviewSummary: fallback.overallAssessment,
    competencies: {
      technicalKnowledge: buildMockScorecard(fallbackScore, 'technical knowledge'),
      problemSolving: buildMockScorecard(fallbackScore, 'problem solving'),
      communication: buildMockScorecard(fallbackScore >= 70 ? 80 : 50, 'communication'),
      conceptualUnderstanding: buildMockScorecard(fallbackScore, 'conceptual understanding'),
      practicalReasoning: buildMockScorecard(fallbackScore, 'practical reasoning'),
      roleSpecific: buildMockScorecard(fallbackScore, `${input.jobConfig.jobTitle} core skills`),
    },
    strongestAreas: fallback.notableStrengths,
    weakestAreas: fallback.areasToProbeInLiveRound,
    suggestedNextSteps: [
      'Conduct collaborative technical interview round',
      'Verify hands-on debugging on complex codebase'
    ],
    hiringRecommendation: fallbackScore >= 70 ? 'Recommend' : 'Borderline',
    recommendationDisclaimer: 'Advisory fallback evaluation report. Automated assessment is for screening guidance only and must not be used as an automated hiring decision.',
  };

  return {
    evaluation: {
      ...fallback,
      overallScore: fallbackScore,
      detailedEvaluation: detailed,
      evaluationStatus: 'completed',
    },
    detailed,
    isAiGenerated: false,
  };
}
