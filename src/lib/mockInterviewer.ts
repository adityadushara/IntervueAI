import { JobConfiguration, InterviewQuestion } from '@/types/interview';

export function getCandidateGreeting(jobConfig: JobConfiguration, candidateName: string): string {
  const cleanName = candidateName.trim() || 'Candidate';
  return `Hello ${cleanName}, welcome to your simulated interview for the ${jobConfig.seniorityLevel} ${jobConfig.jobTitle} position. Today's interview consists of ${jobConfig.questionCount} ${jobConfig.interviewType.toLowerCase()} questions and is designed to take approximately ${jobConfig.expectedDurationMinutes} minutes. Please take your time to structure your responses clearly. Let's start with your first question!`;
}

export function generateMockFeedbackForAnswer(
  _question: InterviewQuestion,
  _answerText: string,
  answerIndex: number,
  totalQuestions: number
): string {
  const intros = [
    "Thank you. Your response has been noted and logged for the hiring team.",
    "Got it. Thank you for walking through your thought process.",
    "Understood. That provides good context on your technical approach.",
    "Thank you for those details."
  ];
  const intro = intros[answerIndex % intros.length];

  const nextStep = answerIndex + 1 < totalQuestions 
    ? ` Let's move on to Question ${answerIndex + 2} of ${totalQuestions}.`
    : ` That completes all questions for this session. Please submit your interview to finalize your assessment.`;

  return `${intro}${nextStep}`;
}
