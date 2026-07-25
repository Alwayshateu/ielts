import { getPracticeAcceptedAnswers, getPracticeAnswerState, scorePracticeAnswers } from './practice-answer-check';
import type { PracticeQuestion } from './types';

export type PracticeReviewQueueReason = 'incorrect' | 'skipped' | 'manual' | 'flagged' | 'note';
export type PracticeReviewTone = 'red' | 'amber' | 'sky';

export type PracticeReviewQueueItem = {
  question: PracticeQuestion;
  reason: PracticeReviewQueueReason;
  label: string;
  tone: PracticeReviewTone;
  userAnswer: string;
  acceptedAnswer: string;
  note: string | null;
};

export type PracticeQuestionTypeStat = {
  questionType: PracticeQuestion['question_type'];
  label: string;
  total: number;
  answered: number;
  correct: number;
  incorrect: number;
  skipped: number;
  manualReview: number;
  accuracy: number | null;
};

export type PracticeReviewReport = {
  score: ReturnType<typeof scorePracticeAnswers>;
  noteCount: number;
  manualOnly: boolean;
  canReveal: boolean;
  elapsedLabel: string;
  completionPercent: number;
  questionTypeStats: PracticeQuestionTypeStat[];
  focusSummary: string;
  nextSteps: string[];
  rubricSummary: { ratedQuestions: number; averageBand: number | null };
  queue: PracticeReviewQueueItem[];
};

export function formatPracticeSessionClock(seconds: number) {
  const safeSeconds = Math.max(0, seconds);
  const minutes = Math.floor(safeSeconds / 60);
  const remainingSeconds = safeSeconds % 60;

  return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
}

function labelQuestionType(type: PracticeQuestion['question_type']) {
  const labels: Record<PracticeQuestion['question_type'], string> = {
    multiple_choice: 'Multiple Choice',
    true_false_not_given: 'True / False / NG',
    sentence_completion: 'Sentence Completion',
    short_answer: 'Short Answer',
    writing_task: 'Writing Task',
    speaking_response: 'Speaking Response',
  };

  return labels[type] ?? type;
}

function buildQuestionTypeStats({
  questions,
  answers,
  showResults,
}: {
  questions: PracticeQuestion[];
  answers: Record<string, string>;
  showResults: boolean;
}) {
  const stats = new Map<PracticeQuestion['question_type'], PracticeQuestionTypeStat>();

  questions.forEach((question) => {
    const current = stats.get(question.question_type) ?? {
      questionType: question.question_type,
      label: labelQuestionType(question.question_type),
      total: 0,
      answered: 0,
      correct: 0,
      incorrect: 0,
      skipped: 0,
      manualReview: 0,
      accuracy: null,
    };
    const answer = answers[question.id] ?? '';
    const state = getPracticeAnswerState(question, answer, showResults);

    current.total += 1;
    if (answer.trim()) current.answered += 1;
    if (showResults) {
      if (state === 'correct') current.correct += 1;
      if (state === 'incorrect') current.incorrect += 1;
      if (state === 'skipped') current.skipped += 1;
      if (state === 'manual_review') current.manualReview += 1;
    }

    stats.set(question.question_type, current);
  });

  return [...stats.values()].map((stat) => {
    const objectiveTotal = stat.total - stat.manualReview;
    return {
      ...stat,
      accuracy: showResults && objectiveTotal > 0 ? Math.round((stat.correct / objectiveTotal) * 100) : null,
    };
  });
}

function buildFocusSummary(score: ReturnType<typeof scorePracticeAnswers>, queue: PracticeReviewQueueItem[]) {
  if (score.total === 0) return '暂无题目。';
  if (score.answered === 0) return '先完成至少一道题，再生成本地复盘。';
  if (score.manualReview === score.answered && score.objectiveTotal === 0) {
    return '这次是主观任务，重点看结构、展开、流利度和自评笔记。';
  }
  if (queue.some((item) => item.reason === 'incorrect')) {
    return '优先处理错题：回到材料中定位证据，再比较你的答案和 reference。';
  }
  if (queue.some((item) => item.reason === 'skipped')) {
    return '优先补齐跳过题：先看题干定位词，再回材料或 transcript 找同义替换。';
  }
  if (queue.some((item) => item.reason === 'manual')) {
    return '主观回应已进入待反馈队列：先按 checklist 自评，再准备后续 AI / rubric feedback。';
  }
  if (queue.length > 0) return '当前主要是你主动标记或记录的复盘点。';
  return '没有高优先级复盘项，可以进入下一组或提高难度。';
}

function buildNextSteps({
  score,
  queue,
  noteCount,
  flaggedCount,
}: {
  score: ReturnType<typeof scorePracticeAnswers>;
  queue: PracticeReviewQueueItem[];
  noteCount: number;
  flaggedCount: number;
}) {
  const steps: string[] = [];

  if (score.skipped > 0) steps.push(`补齐 ${score.skipped} 道未作答题，先不要看解析。`);
  if (score.incorrect > 0) steps.push(`复盘 ${score.incorrect} 道错题，写下错因：定位、同义替换、语法或粗心。`);
  if (score.manualReview > 0) steps.push(`对 ${score.manualReview} 份主观回应做 checklist 自评，标出下一稿要改的地方。`);
  if (flaggedCount > 0) steps.push(`回看 ${flaggedCount} 个主动标记点，确认是否已经解决。`);
  if (noteCount > 0) steps.push(`整理 ${noteCount} 条复盘笔记，把可迁移的表达或策略留下。`);
  if (steps.length === 0 && queue.length === 0) steps.push('本组状态良好：可以进入下一组 Session 或切到 Challenge。');

  return steps.slice(0, 4);
}

function buildRubricSummary(rubricRatingsByQuestionId: Record<string, Record<string, number>>) {
  const questionRatings = Object.values(rubricRatingsByQuestionId)
    .map((ratings) => Object.values(ratings).filter((rating) => Number.isFinite(rating)))
    .filter((ratings) => ratings.length > 0);
  const allRatings = questionRatings.flat();

  return {
    ratedQuestions: questionRatings.length,
    averageBand: allRatings.length
      ? Math.round((allRatings.reduce((sum, rating) => sum + rating, 0) / allRatings.length) * 10) / 10
      : null,
  };
}

function buildReviewQueue({
  questions,
  answers,
  flaggedQuestionIds,
  reviewNotesByQuestionId,
  showResults,
}: {
  questions: PracticeQuestion[];
  answers: Record<string, string>;
  flaggedQuestionIds: string[];
  reviewNotesByQuestionId: Record<string, string>;
  showResults: boolean;
}) {
  const queue = new Map<string, Omit<PracticeReviewQueueItem, 'userAnswer' | 'acceptedAnswer' | 'note'>>();

  const add = (question: PracticeQuestion, item: Omit<PracticeReviewQueueItem, 'question' | 'userAnswer' | 'acceptedAnswer' | 'note'>) => {
    if (!queue.has(question.id)) {
      queue.set(question.id, { question, ...item });
    }
  };

  if (showResults) {
    questions.forEach((question) => {
      const state = getPracticeAnswerState(question, answers[question.id] ?? '', true);

      if (state === 'incorrect') {
        add(question, { reason: 'incorrect', label: '需要复盘', tone: 'red' });
      }
    });

    questions.forEach((question) => {
      const state = getPracticeAnswerState(question, answers[question.id] ?? '', true);

      if (state === 'skipped') {
        add(question, { reason: 'skipped', label: '未作答', tone: 'amber' });
      }
    });

    questions.forEach((question) => {
      const state = getPracticeAnswerState(question, answers[question.id] ?? '', true);

      if (state === 'manual_review') {
        add(question, { reason: 'manual', label: '待反馈', tone: 'sky' });
      }
    });
  }

  questions.forEach((question) => {
    if (flaggedQuestionIds.includes(question.id)) {
      add(question, { reason: 'flagged', label: '已标记', tone: 'amber' });
    }
  });

  questions.forEach((question) => {
    if (reviewNotesByQuestionId[question.id]?.trim()) {
      add(question, { reason: 'note', label: '有笔记', tone: 'sky' });
    }
  });

  return [...queue.values()].map((item) => ({
    ...item,
    userAnswer: answers[item.question.id] ?? '',
    acceptedAnswer: getPracticeAcceptedAnswers(item.question)[0] ?? 'manual review',
    note: reviewNotesByQuestionId[item.question.id]?.trim() || null,
  }));
}

export function buildPracticeReviewReport({
  questions,
  answers,
  showResults,
  flaggedQuestionIds,
  reviewNotesByQuestionId,
  rubricRatingsByQuestionId,
  elapsedSeconds,
}: {
  questions: PracticeQuestion[];
  answers: Record<string, string>;
  showResults: boolean;
  flaggedQuestionIds: string[];
  reviewNotesByQuestionId: Record<string, string>;
  rubricRatingsByQuestionId?: Record<string, Record<string, number>>;
  elapsedSeconds: number;
}): PracticeReviewReport {
  const score = scorePracticeAnswers(questions, answers);
  const noteCount = Object.values(reviewNotesByQuestionId).filter((note) => note.trim()).length;
  const queue = buildReviewQueue({ questions, answers, flaggedQuestionIds, reviewNotesByQuestionId, showResults });

  return {
    score,
    noteCount,
    manualOnly: score.manualReview > 0 && score.objectiveTotal === 0,
    canReveal: score.answered > 0,
    elapsedLabel: formatPracticeSessionClock(elapsedSeconds),
    completionPercent: score.total > 0 ? Math.round((score.answered / score.total) * 100) : 0,
    questionTypeStats: buildQuestionTypeStats({ questions, answers, showResults }),
    focusSummary: buildFocusSummary(score, queue),
    nextSteps: buildNextSteps({
      score,
      queue,
      noteCount,
      flaggedCount: flaggedQuestionIds.length,
    }),
    rubricSummary: buildRubricSummary(rubricRatingsByQuestionId ?? {}),
    queue,
  };
}
