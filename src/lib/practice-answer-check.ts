import type { PracticeQuestion } from './types';

export type PracticeAnswerState = 'unanswered' | 'answered' | 'correct' | 'incorrect' | 'skipped' | 'manual_review';

function normalizeAnswer(value: string, caseSensitive?: boolean) {
  const collapsed = value.trim().replace(/\s+/g, ' ');
  return caseSensitive ? collapsed : collapsed.toLowerCase();
}

export function getPracticeAcceptedAnswers(question: PracticeQuestion) {
  return [
    ...question.answer_key.answers,
    ...(question.answer_key.acceptedAlternatives ?? []),
  ];
}

export function isPracticeAnswerCorrect(question: PracticeQuestion, userAnswer: string) {
  if (!userAnswer.trim()) return false;

  const acceptedAnswers = getPracticeAcceptedAnswers(question);
  if (acceptedAnswers.length === 0) return false;

  const normalizedUser = normalizeAnswer(userAnswer, question.answer_key.caseSensitive);

  return acceptedAnswers.some(
    (answer) => normalizeAnswer(answer, question.answer_key.caseSensitive) === normalizedUser
  );
}

export function getPracticeAnswerState(
  question: PracticeQuestion,
  userAnswer: string,
  showResults: boolean
): PracticeAnswerState {
  const answered = Boolean(userAnswer.trim());

  const acceptedAnswers = getPracticeAcceptedAnswers(question);

  if (!showResults) return answered ? 'answered' : 'unanswered';
  if (!answered) return 'skipped';
  if (acceptedAnswers.length === 0) return 'manual_review';

  return isPracticeAnswerCorrect(question, userAnswer) ? 'correct' : 'incorrect';
}

export function scorePracticeAnswers(
  questions: PracticeQuestion[],
  answers: Record<string, string>
) {
  const states = questions.map((question) => getPracticeAnswerState(question, answers[question.id] ?? '', true));
  const answered = states.filter((state) => state === 'correct' || state === 'incorrect' || state === 'manual_review').length;
  const correct = states.filter((state) => state === 'correct').length;
  const incorrect = states.filter((state) => state === 'incorrect').length;
  const skipped = states.filter((state) => state === 'skipped').length;
  const manualReview = states.filter((state) => state === 'manual_review').length;
  const objectiveTotal = questions.length - manualReview;

  return {
    answered,
    correct,
    incorrect,
    skipped,
    manualReview,
    total: questions.length,
    objectiveTotal,
    accuracy: objectiveTotal > 0 ? Math.round((correct / objectiveTotal) * 100) : 0,
  };
}
