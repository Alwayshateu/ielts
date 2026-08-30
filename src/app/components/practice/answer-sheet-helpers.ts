import type { PracticeQuestion } from '@/lib/types';

export function optionMarker(index: number) {
  return String.fromCharCode(65 + index);
}

export function labelQuestionType(type: PracticeQuestion['question_type']) {
  const labels: Record<PracticeQuestion['question_type'], string> = {
    multiple_choice: 'Multiple Choice',
    true_false_not_given: 'True / False / Not Given',
    sentence_completion: 'Sentence Completion',
    short_answer: 'Short Answer',
    writing_task: 'Writing Task',
    speaking_response: 'Speaking Response',
  };

  return labels[type] ?? type;
}

export function isExtendedResponse(question: PracticeQuestion) {
  return question.question_type === 'writing_task' || question.question_type === 'speaking_response';
}

export function countWords(value: string) {
  return value.trim().split(/\s+/).filter(Boolean).length;
}

export function getSpeakingChecklist(answer: string) {
  return [
    { label: 'What / when / who covered', done: /\b(what|when|who|because|benefit|improve|changed?)\b/i.test(answer) || countWords(answer) >= 30 },
    { label: 'Reason or example included', done: /\b(for example|because|for instance|as a result|so that)\b/i.test(answer) },
    { label: 'Self-review note present', done: /\b(fluency|pronunciation|grammar|vocabulary|improve|next time)\b/i.test(answer) },
  ];
}
