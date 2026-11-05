import { InterviewConfig, InterviewQuestion, CandidateAnswer } from '@/types/interview';

export function getGreetingMessage(config: InterviewConfig): string {
  const roleName = config.role === 'Other / Custom Role' ? (config.customRole || 'Software Professional') : config.role;
  return `Hello ${config.candidateName}! Welcome to your simulated interview for the ${config.level.toUpperCase()} ${roleName} role. Today we will go through ${config.questionCount} ${config.interviewType} questions. Take your time, explain your thought process clearly, and let's get started with your first question!`;
}

export function generateMockFeedbackForAnswer(
  question: InterviewQuestion,
  answerText: string,
  answerIndex: number,
  totalQuestions: number
): string {
  const words = answerText.trim().split(/\s+/).filter(Boolean).length;
  
  const intros = [
    "Thank you for sharing your perspective.",
    "Understood. That's a thoughtful breakdown.",
    "Good explanation. I appreciate how you addressed that.",
    "Got it. You highlighted some key architectural considerations."
  ];
  const intro = intros[answerIndex % intros.length];

  let commentary = '';
  if (words < 20) {
    commentary = "Your answer was concise. In a real technical interview, feel free to elaborate further with specific trade-offs or personal experiences.";
  } else if (words < 60) {
    commentary = "Solid points covering the core mechanics. Good focus on direct impact.";
  } else {
    commentary = "Very comprehensive answer! You clearly demonstrated familiarity with the domain and articulated the reasoning well.";
  }

  const nextStep = answerIndex + 1 < totalQuestions 
    ? ` Let's move on to Question ${answerIndex + 2} of ${totalQuestions}.`
    : ` That concludes our final question! Let me calculate your interview scorecard and breakdown now.`;

  return `${intro} ${commentary}${nextStep}`;
}
