import { getPracticeAcceptedAnswers, getPracticeAnswerState } from './practice-answer-check';
import { hasBrowserStorage, safeParseJson } from './practice-session-draft';
import type { PracticeReviewReport } from './practice-session-report';
import type {
  PracticeDifficulty,
  PracticeMode,
  PracticeQuestion,
  PracticeQuestionType,
  PracticeSkill,
  PracticeUnit,
} from './types';

export const PRACTICE_SESSION_HISTORY_STORAGE_KEY = 'ielts-trainer:practice-session:history';
export const PRACTICE_SESSION_HISTORY_LIMIT = 120;

/** Snapshot-only outcomes (recorded with results committed — no transient 'unanswered'/'answered'). */
export type PracticeAttemptOutcome = 'correct' | 'incorrect' | 'skipped' | 'manual_review';

const ATTEMPT_OUTCOMES: PracticeAttemptOutcome[] = ['correct', 'incorrect', 'skipped', 'manual_review'];
const PRACTICE_QUESTION_TYPES: PracticeQuestionType[] = [
  'multiple_choice',
  'true_false_not_given',
  'sentence_completion',
  'short_answer',
  'writing_task',
  'speaking_response',
];
const ATTEMPT_PROMPT_MAX = 240;
const ATTEMPT_ANSWER_MAX = 400;

/**
 * A compact per-question record of one attempt. Intentionally mirrors the future Supabase
 * `practice_answers` row shape (question_id / outcome / user_answer / correct_answer) so the
 * local snapshot can be backfilled to the DB without a schema change.
 */
export type PracticeAttemptAnswer = {
  questionId: string;
  questionNumber: number;
  questionType: PracticeQuestionType;
  prompt: string;
  outcome: PracticeAttemptOutcome;
  userAnswer: string;
  correctAnswer: string;
};

const DAY_MS = 86_400_000;

function truncate(value: string, max: number) {
  const trimmed = value.trim();
  return trimmed.length > max ? `${trimmed.slice(0, max - 1)}…` : trimmed;
}

/**
 * Build the per-question snapshot for a finished attempt. Pure — same primitives the review report
 * uses, so outcomes stay consistent with the on-screen results.
 */
export function buildPracticeAttemptAnswers({
  questions,
  answers,
}: {
  questions: PracticeQuestion[];
  answers: Record<string, string>;
}): PracticeAttemptAnswer[] {
  return questions.map((question, index) => {
    const raw = answers[question.id] ?? '';
    const state = getPracticeAnswerState(question, raw, true);
    const outcome: PracticeAttemptOutcome = ATTEMPT_OUTCOMES.includes(state as PracticeAttemptOutcome)
      ? (state as PracticeAttemptOutcome)
      : 'skipped';
    const accepted = getPracticeAcceptedAnswers(question);

    return {
      questionId: question.id,
      questionNumber: Number.isFinite(question.question_number) ? question.question_number : index + 1,
      questionType: question.question_type,
      prompt: truncate(question.question_text, ATTEMPT_PROMPT_MAX),
      outcome,
      userAnswer: truncate(raw, ATTEMPT_ANSWER_MAX),
      correctAnswer: outcome === 'manual_review' ? '' : truncate(accepted[0] ?? '', ATTEMPT_PROMPT_MAX),
    };
  });
}

export type PracticeSessionHistoryEntry = {
  id: string;
  unitId: string;
  slug: string;
  title: string;
  skill: PracticeSkill;
  mode: PracticeMode;
  difficulty: PracticeDifficulty;
  recordedAt: number;
  elapsedSeconds: number;
  answered: number;
  total: number;
  correct: number;
  incorrect: number;
  skipped: number;
  manualReview: number;
  objectiveTotal: number;
  accuracy: number | null;
  completionPercent: number;
  selfRatedBand: number | null;
  /** Per-question snapshot. Optional for backward compatibility with entries recorded before this shipped. */
  answers?: PracticeAttemptAnswer[];
};

export type PracticeSessionHistoryTrend = 'up' | 'down' | 'flat' | null;

export type PracticeSessionHistorySkillStat = {
  skill: PracticeSkill;
  attempts: number;
  averageAccuracy: number | null;
};

export type PracticeSessionHistorySummary = {
  totalAttempts: number;
  sessionsPracticed: number;
  totalStudySeconds: number;
  latestAccuracy: number | null;
  bestAccuracy: number | null;
  averageAccuracy: number | null;
  accuracyTrend: PracticeSessionHistoryTrend;
  latestBand: number | null;
  bestBand: number | null;
  lastRecordedAt: number | null;
  bySkill: PracticeSessionHistorySkillStat[];
};

const SKILL_ORDER: PracticeSkill[] = ['foundation', 'reading', 'listening', 'writing', 'speaking'];

/** Build a single history snapshot from a completed session's review report. Pure. */
export function buildPracticeSessionHistoryEntry({
  unit,
  report,
  elapsedSeconds,
  recordedAt,
  id,
  answers,
}: {
  unit: PracticeUnit;
  report: PracticeReviewReport;
  elapsedSeconds: number;
  recordedAt: number;
  id?: string;
  answers?: Record<string, string>;
}): PracticeSessionHistoryEntry {
  const { score } = report;

  return {
    id: id ?? `${unit.id}:${recordedAt}`,
    unitId: unit.id,
    slug: unit.slug,
    title: unit.title,
    skill: unit.skill,
    mode: unit.mode,
    difficulty: unit.difficulty,
    recordedAt,
    elapsedSeconds: Math.max(0, Math.round(elapsedSeconds)),
    answered: score.answered,
    total: score.total,
    correct: score.correct,
    incorrect: score.incorrect,
    skipped: score.skipped,
    manualReview: score.manualReview,
    objectiveTotal: score.objectiveTotal,
    accuracy: score.objectiveTotal > 0 ? score.accuracy : null,
    completionPercent: report.completionPercent,
    selfRatedBand: report.rubricSummary.averageBand,
    answers: answers ? buildPracticeAttemptAnswers({ questions: unit.questions, answers }) : undefined,
  };
}

/** Two attempts describe the "same" outcome — used to avoid duplicate records from reloads/re-renders. */
export function isSamePracticeAttemptSignature(
  a: PracticeSessionHistoryEntry,
  b: PracticeSessionHistoryEntry
) {
  return (
    a.unitId === b.unitId &&
    a.answered === b.answered &&
    a.correct === b.correct &&
    a.incorrect === b.incorrect &&
    a.skipped === b.skipped &&
    a.manualReview === b.manualReview &&
    a.completionPercent === b.completionPercent &&
    a.selfRatedBand === b.selfRatedBand
  );
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function sanitizeAttemptAnswers(input: unknown, total: number): PracticeAttemptAnswer[] | undefined {
  if (!Array.isArray(input)) return undefined;

  return input
    .map((value, index): PracticeAttemptAnswer | null => {
      if (!value || typeof value !== 'object') return null;

      const answer = value as Partial<PracticeAttemptAnswer>;
      if (
        typeof answer.questionId !== 'string' ||
        !answer.questionId ||
        typeof answer.questionType !== 'string' ||
        !PRACTICE_QUESTION_TYPES.includes(answer.questionType as PracticeQuestionType) ||
        typeof answer.outcome !== 'string' ||
        !ATTEMPT_OUTCOMES.includes(answer.outcome as PracticeAttemptOutcome)
      ) {
        return null;
      }

      return {
        questionId: answer.questionId,
        questionNumber: isFiniteNumber(answer.questionNumber)
          ? Math.max(1, Math.round(answer.questionNumber))
          : index + 1,
        questionType: answer.questionType as PracticeQuestionType,
        prompt: typeof answer.prompt === 'string' ? truncate(answer.prompt, ATTEMPT_PROMPT_MAX) : '',
        outcome: answer.outcome as PracticeAttemptOutcome,
        userAnswer: typeof answer.userAnswer === 'string' ? truncate(answer.userAnswer, ATTEMPT_ANSWER_MAX) : '',
        correctAnswer:
          typeof answer.correctAnswer === 'string' ? truncate(answer.correctAnswer, ATTEMPT_PROMPT_MAX) : '',
      };
    })
    .filter((answer): answer is PracticeAttemptAnswer => answer !== null)
    .sort((a, b) => a.questionNumber - b.questionNumber)
    .slice(0, total);
}

function sanitizeEntry(input: unknown): PracticeSessionHistoryEntry | null {
  if (!input || typeof input !== 'object') return null;

  const entry = input as Partial<PracticeSessionHistoryEntry>;
  if (
    typeof entry.unitId !== 'string' ||
    typeof entry.title !== 'string' ||
    typeof entry.skill !== 'string' ||
    !isFiniteNumber(entry.recordedAt)
  ) {
    return null;
  }

  const total = isFiniteNumber(entry.total) ? Math.max(0, Math.round(entry.total)) : 0;
  const clampCount = (value: unknown) =>
    isFiniteNumber(value) ? Math.min(total, Math.max(0, Math.round(value))) : 0;
  const objectiveTotal = isFiniteNumber(entry.objectiveTotal)
    ? Math.min(total, Math.max(0, Math.round(entry.objectiveTotal)))
    : 0;

  return {
    id: typeof entry.id === 'string' && entry.id ? entry.id : `${entry.unitId}:${entry.recordedAt}`,
    unitId: entry.unitId,
    slug: typeof entry.slug === 'string' ? entry.slug : entry.unitId,
    title: entry.title,
    skill: entry.skill as PracticeSkill,
    mode: (typeof entry.mode === 'string' ? entry.mode : 'basic') as PracticeMode,
    difficulty: (typeof entry.difficulty === 'string' ? entry.difficulty : 'medium') as PracticeDifficulty,
    recordedAt: entry.recordedAt,
    elapsedSeconds: isFiniteNumber(entry.elapsedSeconds) ? Math.max(0, Math.round(entry.elapsedSeconds)) : 0,
    answered: clampCount(entry.answered),
    total,
    correct: clampCount(entry.correct),
    incorrect: clampCount(entry.incorrect),
    skipped: clampCount(entry.skipped),
    manualReview: clampCount(entry.manualReview),
    objectiveTotal,
    accuracy:
      entry.accuracy === null || entry.accuracy === undefined
        ? null
        : isFiniteNumber(entry.accuracy)
          ? Math.min(100, Math.max(0, Math.round(entry.accuracy)))
          : null,
    completionPercent: isFiniteNumber(entry.completionPercent)
      ? Math.min(100, Math.max(0, Math.round(entry.completionPercent)))
      : 0,
    selfRatedBand:
      entry.selfRatedBand === null || entry.selfRatedBand === undefined
        ? null
        : isFiniteNumber(entry.selfRatedBand)
          ? Math.min(9, Math.max(0, Math.round(entry.selfRatedBand * 10) / 10))
          : null,
    answers: sanitizeAttemptAnswers(entry.answers, total),
  };
}

/** Validate and normalize a raw stored list. Returns entries newest-first. Pure. */
export function sanitizePracticeSessionHistory(input: unknown): PracticeSessionHistoryEntry[] {
  if (!Array.isArray(input)) return [];

  return input
    .map(sanitizeEntry)
    .filter((entry): entry is PracticeSessionHistoryEntry => entry !== null)
    .sort((a, b) => b.recordedAt - a.recordedAt)
    .slice(0, PRACTICE_SESSION_HISTORY_LIMIT);
}

function average(values: number[]) {
  if (values.length === 0) return null;
  return Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 10) / 10;
}

/** Aggregate stats for the History dashboard. Pure. */
export function summarizePracticeSessionHistory(
  entries: PracticeSessionHistoryEntry[]
): PracticeSessionHistorySummary {
  if (entries.length === 0) {
    return {
      totalAttempts: 0,
      sessionsPracticed: 0,
      totalStudySeconds: 0,
      latestAccuracy: null,
      bestAccuracy: null,
      averageAccuracy: null,
      accuracyTrend: null,
      latestBand: null,
      bestBand: null,
      lastRecordedAt: null,
      bySkill: [],
    };
  }

  const ascending = [...entries].sort((a, b) => a.recordedAt - b.recordedAt);
  const objectiveAttempts = ascending.filter(
    (entry): entry is PracticeSessionHistoryEntry & { accuracy: number } => entry.accuracy !== null
  );
  const accuracyValues = objectiveAttempts.map((entry) => entry.accuracy);
  const latestAccuracy = accuracyValues.length ? accuracyValues[accuracyValues.length - 1] : null;
  const previousAccuracy = accuracyValues.length > 1 ? accuracyValues[accuracyValues.length - 2] : null;

  let accuracyTrend: PracticeSessionHistoryTrend = null;
  if (latestAccuracy !== null && previousAccuracy !== null) {
    if (latestAccuracy > previousAccuracy) accuracyTrend = 'up';
    else if (latestAccuracy < previousAccuracy) accuracyTrend = 'down';
    else accuracyTrend = 'flat';
  }

  const bandValues = ascending
    .map((entry) => entry.selfRatedBand)
    .filter((band): band is number => band !== null);

  const bySkill = SKILL_ORDER.map((skill) => {
    const skillEntries = entries.filter((entry) => entry.skill === skill);
    const skillAccuracies = skillEntries
      .map((entry) => entry.accuracy)
      .filter((accuracy): accuracy is number => accuracy !== null);

    return {
      skill,
      attempts: skillEntries.length,
      averageAccuracy: average(skillAccuracies),
    };
  }).filter((stat) => stat.attempts > 0);

  return {
    totalAttempts: entries.length,
    sessionsPracticed: new Set(entries.map((entry) => entry.unitId)).size,
    totalStudySeconds: entries.reduce((sum, entry) => sum + entry.elapsedSeconds, 0),
    latestAccuracy,
    bestAccuracy: accuracyValues.length ? Math.max(...accuracyValues) : null,
    averageAccuracy: average(accuracyValues),
    accuracyTrend,
    latestBand: bandValues.length ? bandValues[bandValues.length - 1] : null,
    bestBand: bandValues.length ? Math.max(...bandValues) : null,
    lastRecordedAt: Math.max(...entries.map((entry) => entry.recordedAt)),
    bySkill,
  };
}

/** Count consecutive study days ending today/yesterday relative to referenceTs (UTC day buckets). Pure. */
export function computePracticeStudyStreak(
  entries: PracticeSessionHistoryEntry[],
  referenceTs: number
) {
  if (entries.length === 0) return 0;

  const days = new Set(entries.map((entry) => Math.floor(entry.recordedAt / DAY_MS)));
  const today = Math.floor(referenceTs / DAY_MS);

  let cursor: number;
  if (days.has(today)) cursor = today;
  else if (days.has(today - 1)) cursor = today - 1;
  else return 0;

  let streak = 0;
  while (days.has(cursor)) {
    streak += 1;
    cursor -= 1;
  }

  return streak;
}

export function readPracticeSessionHistory(): PracticeSessionHistoryEntry[] {
  if (!hasBrowserStorage()) return [];

  return sanitizePracticeSessionHistory(
    safeParseJson<unknown>(window.localStorage.getItem(PRACTICE_SESSION_HISTORY_STORAGE_KEY))
  );
}

export function writePracticeSessionHistory(entries: PracticeSessionHistoryEntry[]) {
  if (!hasBrowserStorage()) return;

  window.localStorage.setItem(
    PRACTICE_SESSION_HISTORY_STORAGE_KEY,
    JSON.stringify(entries.slice(0, PRACTICE_SESSION_HISTORY_LIMIT))
  );
}

/**
 * Append a completed-session snapshot. Skips writing when the newest stored entry describes the
 * same outcome (guards against reload/re-render double-fires). Returns the updated newest-first list.
 */
export function appendPracticeSessionHistoryEntry(
  entry: PracticeSessionHistoryEntry
): PracticeSessionHistoryEntry[] {
  const current = readPracticeSessionHistory();
  const newest = current[0];

  if (newest && isSamePracticeAttemptSignature(newest, entry)) {
    return current;
  }

  const next = [entry, ...current].slice(0, PRACTICE_SESSION_HISTORY_LIMIT);
  writePracticeSessionHistory(next);

  return next;
}

export function clearPracticeSessionHistory() {
  if (!hasBrowserStorage()) return;

  window.localStorage.removeItem(PRACTICE_SESSION_HISTORY_STORAGE_KEY);
}
