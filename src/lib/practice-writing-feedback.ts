/**
 * Local, non-scoring analysis for IELTS Writing responses.
 *
 * This powers the real-time Writing feedback panel in the Practice Session
 * preview. It only reports structural signals (word count vs target, sentence /
 * paragraph counts, over-long sentences, and heuristic structure checks). It is
 * NOT an automatic band score and never writes anything to the database.
 */

export const DEFAULT_WRITING_WORD_TARGET = 250;
export const LONG_SENTENCE_WORD_THRESHOLD = 40;
export const NEAR_TARGET_RATIO = 0.9;

export type WritingFeedbackStatus = 'empty' | 'under' | 'near' | 'met';

export interface WritingChecklistItem {
  id: string;
  label: string;
  done: boolean;
}

export interface WritingFeedbackAnalysis {
  wordCount: number;
  wordTarget: number;
  progressPercent: number;
  sentenceCount: number;
  paragraphCount: number;
  avgWordsPerSentence: number;
  longSentenceCount: number;
  status: WritingFeedbackStatus;
  remainingWords: number;
  checklist: WritingChecklistItem[];
  checklistCompleted: number;
}

export function countWritingWords(value: string): number {
  return value.trim().split(/\s+/).filter(Boolean).length;
}

export function splitWritingSentences(value: string): string[] {
  return value
    .split(/[.!?]+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

export function countWritingParagraphs(value: string): number {
  return value
    .split(/\n+/)
    .map((block) => block.trim())
    .filter(Boolean).length;
}

export function resolveWordTarget(target: unknown): number {
  return typeof target === 'number' && Number.isFinite(target) && target > 0
    ? Math.round(target)
    : DEFAULT_WRITING_WORD_TARGET;
}

function buildWritingChecklist(answer: string, wordCount: number, wordTarget: number): WritingChecklistItem[] {
  return [
    {
      id: 'position',
      label: 'Clear position',
      done: /\b(i believe|i think|in my opinion|overall|therefore)\b/i.test(answer),
    },
    {
      id: 'bothViews',
      label: 'Both views addressed',
      done: /\b(on the one hand|on one hand|however|although|while|whereas|others? think)\b/i.test(answer),
    },
    {
      id: 'wordTarget',
      label: `Word target ${wordTarget}+`,
      done: wordCount >= wordTarget,
    },
    {
      id: 'conclusion',
      label: 'Conclusion / final judgement',
      done: /\b(in conclusion|to conclude|overall)\b/i.test(answer),
    },
  ];
}

export function analyzeWritingResponse(answer: string, target?: unknown): WritingFeedbackAnalysis {
  const wordTarget = resolveWordTarget(target);
  const wordCount = countWritingWords(answer);
  const sentences = splitWritingSentences(answer);
  const sentenceCount = sentences.length;
  const paragraphCount = countWritingParagraphs(answer);
  const avgWordsPerSentence = sentenceCount > 0 ? Math.round(wordCount / sentenceCount) : 0;
  const longSentenceCount = sentences.filter(
    (sentence) => countWritingWords(sentence) > LONG_SENTENCE_WORD_THRESHOLD,
  ).length;
  const progressPercent = wordTarget > 0 ? Math.min(100, Math.round((wordCount / wordTarget) * 100)) : 0;

  const status: WritingFeedbackStatus =
    wordCount === 0
      ? 'empty'
      : wordCount >= wordTarget
        ? 'met'
        : wordCount >= wordTarget * NEAR_TARGET_RATIO
          ? 'near'
          : 'under';

  const checklist = buildWritingChecklist(answer, wordCount, wordTarget);

  return {
    wordCount,
    wordTarget,
    progressPercent,
    sentenceCount,
    paragraphCount,
    avgWordsPerSentence,
    longSentenceCount,
    status,
    remainingWords: Math.max(0, wordTarget - wordCount),
    checklist,
    checklistCompleted: checklist.filter((item) => item.done).length,
  };
}
