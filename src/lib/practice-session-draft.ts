import type { PassageAnnotation, PracticeQuestion, PracticeUnit } from './types';

export type PracticeSessionDraft = {
  answers: Record<string, string>;
  showResults: boolean;
  activeQuestionId: string;
  elapsedSeconds: number;
  flaggedQuestionIds: string[];
  reviewNotesByQuestionId: Record<string, string>;
  mistakeReasonsByQuestionId: Record<string, string[]>;
  rubricRatingsByQuestionId: Record<string, Record<string, number>>;
  updatedAt: number;
};

export type PracticeSessionDraftStatus = {
  answered: number;
  total: number;
  showResults: boolean;
  flagged: number;
  notes: number;
  updatedAt: number;
};

export function getPracticeSessionDraftStorageKey(unitId: string) {
  return `ielts-trainer:practice-session:${unitId}:draft`;
}

export function getPracticeSessionAnnotationsStorageKey(unitId: string) {
  return `ielts-trainer:practice-session:${unitId}:annotations`;
}

export function hasBrowserStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

export function safeParseJson<T>(raw: string | null): T | null {
  if (!raw) return null;

  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function getQuestionIds(questions: PracticeQuestion[]) {
  return new Set(questions.map((question) => question.id));
}

export function createEmptyPracticeSessionDraft(questions: PracticeQuestion[]): PracticeSessionDraft {
  return {
    answers: {},
    showResults: false,
    activeQuestionId: questions[0]?.id ?? '',
    elapsedSeconds: 0,
    flaggedQuestionIds: [],
    reviewNotesByQuestionId: {},
    mistakeReasonsByQuestionId: {},
    rubricRatingsByQuestionId: {},
    updatedAt: 0,
  };
}

export function sanitizePracticeSessionDraft(input: unknown, questions: PracticeQuestion[]): PracticeSessionDraft {
  const fallback = createEmptyPracticeSessionDraft(questions);
  if (!input || typeof input !== 'object') return fallback;

  const draft = input as Partial<PracticeSessionDraft>;
  const questionIds = getQuestionIds(questions);
  const answers = draft.answers && typeof draft.answers === 'object'
    ? Object.fromEntries(
        Object.entries(draft.answers).filter(([questionId, answer]) =>
          questionIds.has(questionId) && typeof answer === 'string'
        )
      )
    : {};
  const reviewNotesByQuestionId = draft.reviewNotesByQuestionId && typeof draft.reviewNotesByQuestionId === 'object'
    ? Object.fromEntries(
        Object.entries(draft.reviewNotesByQuestionId).filter(([questionId, note]) =>
          questionIds.has(questionId) && typeof note === 'string'
        )
      )
    : {};
  const mistakeReasonsByQuestionId = draft.mistakeReasonsByQuestionId && typeof draft.mistakeReasonsByQuestionId === 'object'
    ? Object.fromEntries(
        Object.entries(draft.mistakeReasonsByQuestionId).flatMap(([questionId, reasons]) => {
          if (!questionIds.has(questionId) || !Array.isArray(reasons)) return [];
          const safeReasons = [...new Set(reasons)].filter(
            (reason): reason is string => typeof reason === 'string' && reason.trim().length > 0
          );
          return safeReasons.length ? [[questionId, safeReasons]] : [];
        })
      )
    : {};
  const rubricRatingsByQuestionId = draft.rubricRatingsByQuestionId && typeof draft.rubricRatingsByQuestionId === 'object'
    ? Object.fromEntries(
        Object.entries(draft.rubricRatingsByQuestionId).flatMap(([questionId, ratings]) => {
          if (!questionIds.has(questionId) || !ratings || typeof ratings !== 'object' || Array.isArray(ratings)) return [];
          const safeRatings = Object.fromEntries(
            Object.entries(ratings).filter(
              ([criterion, rating]) =>
                typeof criterion === 'string' &&
                criterion.trim().length > 0 &&
                typeof rating === 'number' &&
                Number.isFinite(rating) &&
                rating >= 0 &&
                rating <= 9
            ).map(([criterion, rating]) => [criterion, Math.round((rating as number) * 2) / 2])
          );
          return Object.keys(safeRatings).length ? [[questionId, safeRatings]] : [];
        })
      )
    : {};
  const flaggedQuestionIds = Array.isArray(draft.flaggedQuestionIds)
    ? [...new Set(draft.flaggedQuestionIds)].filter(
        (questionId): questionId is string => typeof questionId === 'string' && questionIds.has(questionId)
      )
    : [];
  const activeQuestionId = draft.activeQuestionId && questionIds.has(draft.activeQuestionId)
    ? draft.activeQuestionId
    : fallback.activeQuestionId;
  const elapsedSeconds = typeof draft.elapsedSeconds === 'number' && Number.isFinite(draft.elapsedSeconds) && draft.elapsedSeconds >= 0
    ? Math.floor(draft.elapsedSeconds)
    : 0;
  const updatedAt = typeof draft.updatedAt === 'number' && Number.isFinite(draft.updatedAt) && draft.updatedAt >= 0
    ? Math.floor(draft.updatedAt)
    : 0;

  return {
    answers,
    showResults: Boolean(draft.showResults),
    activeQuestionId,
    elapsedSeconds,
    flaggedQuestionIds,
    reviewNotesByQuestionId,
    mistakeReasonsByQuestionId,
    rubricRatingsByQuestionId,
    updatedAt,
  };
}

export function loadPracticeSessionDraft(unitId: string, questions: PracticeQuestion[]) {
  if (!hasBrowserStorage()) return createEmptyPracticeSessionDraft(questions);

  try {
    return sanitizePracticeSessionDraft(
      safeParseJson<unknown>(window.localStorage.getItem(getPracticeSessionDraftStorageKey(unitId))),
      questions
    );
  } catch {
    return createEmptyPracticeSessionDraft(questions);
  }
}

export function savePracticeSessionDraft(unitId: string, draft: PracticeSessionDraft) {
  if (!hasBrowserStorage()) return false;

  try {
    window.localStorage.setItem(getPracticeSessionDraftStorageKey(unitId), JSON.stringify(draft));
    return true;
  } catch {
    return false;
  }
}

export function clearPracticeSessionDraft(unitId: string) {
  if (!hasBrowserStorage()) return false;

  try {
    window.localStorage.removeItem(getPracticeSessionDraftStorageKey(unitId));
    return true;
  } catch {
    return false;
  }
}

export function sanitizePracticeSessionAnnotations(input: unknown): PassageAnnotation[] {
  if (!Array.isArray(input)) return [];

  return input.filter((annotation): annotation is PassageAnnotation => {
    if (!annotation || typeof annotation !== 'object') return false;

    const candidate = annotation as Partial<PassageAnnotation>;

    return (
      typeof candidate.id === 'string' &&
      typeof candidate.text === 'string' &&
      (candidate.kind === 'highlight' || candidate.kind === 'note') &&
      (candidate.note === null || typeof candidate.note === 'string') &&
      typeof candidate.paragraphIndex === 'number' &&
      Number.isFinite(candidate.paragraphIndex) &&
      typeof candidate.startOffset === 'number' &&
      Number.isFinite(candidate.startOffset) &&
      typeof candidate.endOffset === 'number' &&
      Number.isFinite(candidate.endOffset) &&
      candidate.startOffset >= 0 &&
      candidate.endOffset > candidate.startOffset
    );
  });
}

export function loadPracticeSessionAnnotations(unitId: string) {
  if (!hasBrowserStorage()) return [];

  try {
    return sanitizePracticeSessionAnnotations(
      safeParseJson<unknown>(window.localStorage.getItem(getPracticeSessionAnnotationsStorageKey(unitId)))
    );
  } catch {
    return [];
  }
}

export function savePracticeSessionAnnotations(unitId: string, annotations: PassageAnnotation[]) {
  if (!hasBrowserStorage()) return false;

  try {
    window.localStorage.setItem(getPracticeSessionAnnotationsStorageKey(unitId), JSON.stringify(annotations));
    return true;
  } catch {
    return false;
  }
}

export function clearPracticeSessionAnnotations(unitId: string) {
  if (!hasBrowserStorage()) return false;

  try {
    window.localStorage.removeItem(getPracticeSessionAnnotationsStorageKey(unitId));
    return true;
  } catch {
    return false;
  }
}

export function readPracticeSessionDraftStatuses(units: PracticeUnit[]) {
  if (!hasBrowserStorage()) return {};

  return units.reduce<Record<string, PracticeSessionDraftStatus>>((statuses, unit) => {
    const draft = loadPracticeSessionDraft(unit.id, unit.questions);
    const answered = unit.questions.filter((question) => draft.answers[question.id]?.trim()).length;
    const flagged = draft.flaggedQuestionIds.length;
    const notes = Object.values(draft.reviewNotesByQuestionId).filter((note) => note.trim()).length;
    const hasDraftData = answered > 0 || flagged > 0 || notes > 0 || draft.showResults;

    if (!hasDraftData) return statuses;

    statuses[unit.id] = {
      answered,
      total: unit.questions.length,
      showResults: draft.showResults,
      flagged,
      notes,
      updatedAt: draft.updatedAt,
    };

    return statuses;
  }, {});
}
