import type { PassageAnnotation } from '@/lib/types';

// Pure state transitions extracted from usePracticeSessionState's setX((current) => ...) updaters.
// Each takes the current value plus the event args and returns the next value — no React, no I/O —
// so the invariants they encode (toggle idempotency, empty-input clears the key, derived ids) are unit-testable.

// Flag toggle: remove when already flagged, otherwise append. Toggling the same id twice is a no-op.
export function toggleFlag(current: string[], questionId: string): string[] {
  return current.includes(questionId)
    ? current.filter((id) => id !== questionId)
    : [...current, questionId];
}

// Review note: leading whitespace is trimmed; a note that is empty after trimming removes the key
// entirely rather than storing an empty string.
export function setReviewNote(
  current: Record<string, string>,
  questionId: string,
  note: string
): Record<string, string> {
  const trimmed = note.trimStart();
  if (!trimmed) {
    const next = { ...current };
    delete next[questionId];
    return next;
  }

  return { ...current, [questionId]: trimmed };
}

// Mistake reasons: toggle one reason within a question's list. Removing the last reason drops the key
// so a question with no reasons is absent rather than mapped to an empty array.
export function toggleMistakeReason(
  current: Record<string, string[]>,
  questionId: string,
  reason: string
): Record<string, string[]> {
  const reasons = current[questionId] ?? [];
  const nextReasons = reasons.includes(reason)
    ? reasons.filter((item) => item !== reason)
    : [...reasons, reason];
  const next = { ...current };

  if (nextReasons.length === 0) {
    delete next[questionId];
  } else {
    next[questionId] = nextReasons;
  }

  return next;
}

// Rubric rating: nested per-question / per-criterion merge that preserves other criteria's ratings.
export function setRubricRating(
  current: Record<string, Record<string, number>>,
  questionId: string,
  criterion: string,
  rating: number
): Record<string, Record<string, number>> {
  return {
    ...current,
    [questionId]: {
      ...(current[questionId] ?? {}),
      [criterion]: rating,
    },
  };
}

// Annotation add: append with a derived id combining paragraph, 1-based position, and a text prefix.
export function addAnnotation(
  current: PassageAnnotation[],
  annotation: Omit<PassageAnnotation, 'id'>
): PassageAnnotation[] {
  return [
    ...current,
    {
      ...annotation,
      id: `${annotation.paragraphIndex}-${current.length + 1}-${annotation.text.slice(0, 12)}`,
    },
  ];
}

// Annotation update: patch kind/note on the matching id, leaving other annotations untouched.
export function updateAnnotation(
  current: PassageAnnotation[],
  annotationId: string,
  patch: Partial<Pick<PassageAnnotation, 'kind' | 'note'>>
): PassageAnnotation[] {
  return current.map((annotation) =>
    annotation.id === annotationId
      ? {
          ...annotation,
          ...patch,
        }
      : annotation
  );
}

// Annotation remove: drop the annotation with the given id.
export function removeAnnotation(
  current: PassageAnnotation[],
  annotationId: string
): PassageAnnotation[] {
  return current.filter((annotation) => annotation.id !== annotationId);
}

// Review target: the next question needing attention — first unanswered, else first flagged in
// question order. Returns null when everything is answered and nothing is flagged (caller reveals results).
export function pickReviewTarget(
  unansweredQuestions: { id: string }[],
  questions: { id: string }[],
  flaggedQuestionIds: string[]
): string | null {
  const next = unansweredQuestions[0] ?? questions.find((question) => flaggedQuestionIds.includes(question.id));
  return next?.id ?? null;
}
