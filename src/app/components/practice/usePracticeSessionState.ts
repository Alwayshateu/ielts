'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { scorePracticeAnswers } from '@/lib/practice-answer-check';
import {
  clearPracticeSessionAnnotations,
  clearPracticeSessionDraft,
  loadPracticeSessionAnnotations,
  loadPracticeSessionDraft,
  savePracticeSessionAnnotations,
  savePracticeSessionDraft,
} from '@/lib/practice-session-draft';
import {
  appendPracticeSessionHistoryEntry,
  buildPracticeSessionHistoryEntry,
} from '@/lib/practice-session-history';
import { buildPracticeReviewReport } from '@/lib/practice-session-report';
import type { PassageAnnotation, PracticeSkill, PracticeUnit } from '@/lib/types';

const DEFAULT_EXAM_SECONDS_BY_SKILL: Record<PracticeSkill, number> = {
  foundation: 600,
  reading: 1200,
  listening: 600,
  writing: 2400,
  speaking: 120,
};

function getExamDurationSeconds(unit: PracticeUnit) {
  if (typeof unit.time_limit_seconds === 'number' && unit.time_limit_seconds > 0) {
    return unit.time_limit_seconds;
  }

  return DEFAULT_EXAM_SECONDS_BY_SKILL[unit.skill] ?? 600;
}

export function usePracticeSessionState(unit: PracticeUnit) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [activeQuestionId, setActiveQuestionId] = useState(unit.questions[0]?.id ?? '');
  const [showResults, setShowResults] = useState(false);
  const [flaggedQuestionIds, setFlaggedQuestionIds] = useState<string[]>([]);
  const [reviewNotesByQuestionId, setReviewNotesByQuestionId] = useState<Record<string, string>>({});
  const [mistakeReasonsByQuestionId, setMistakeReasonsByQuestionId] = useState<Record<string, string[]>>({});
  const [rubricRatingsByQuestionId, setRubricRatingsByQuestionId] = useState<Record<string, Record<string, number>>>({});
  const [annotations, setAnnotations] = useState<PassageAnnotation[]>([]);
  const [annotationsLoaded, setAnnotationsLoaded] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [draftLoaded, setDraftLoaded] = useState(false);
  const [examMode, setExamMode] = useState(false);
  const [autoSubmitted, setAutoSubmitted] = useState(false);
  const prevShowResultsRef = useRef<boolean | null>(null);
  const examDurationSeconds = getExamDurationSeconds(unit);

  const activeIndex = useMemo(
    () => Math.max(0, unit.questions.findIndex((question) => question.id === activeQuestionId)),
    [activeQuestionId, unit.questions]
  );
  const unansweredQuestions = useMemo(
    () => unit.questions.filter((question) => !answers[question.id]?.trim()),
    [answers, unit.questions]
  );
  const flaggedCount = flaggedQuestionIds.length;
  const score = useMemo(() => scorePracticeAnswers(unit.questions, answers), [answers, unit.questions]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setAnnotations(loadPracticeSessionAnnotations(unit.id));
      setAnnotationsLoaded(true);
    }, 0);

    return () => window.clearTimeout(timer);
  }, [unit.id]);

  useEffect(() => {
    if (!annotationsLoaded) return;

    savePracticeSessionAnnotations(unit.id, annotations);
  }, [annotations, annotationsLoaded, unit.id]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const draft = loadPracticeSessionDraft(unit.id, unit.questions);

      setAnswers(draft.answers);
      setShowResults(draft.showResults);
      setActiveQuestionId(draft.activeQuestionId);
      setElapsedSeconds(draft.elapsedSeconds);
      setFlaggedQuestionIds(draft.flaggedQuestionIds);
      setReviewNotesByQuestionId(draft.reviewNotesByQuestionId);
      setMistakeReasonsByQuestionId(draft.mistakeReasonsByQuestionId);
      setRubricRatingsByQuestionId(draft.rubricRatingsByQuestionId);
      setDraftLoaded(true);
    }, 0);

    return () => window.clearTimeout(timer);
  }, [unit.id, unit.questions]);

  useEffect(() => {
    if (!draftLoaded) return;

    savePracticeSessionDraft(unit.id, {
      answers,
      showResults,
      activeQuestionId,
      elapsedSeconds,
      flaggedQuestionIds,
      reviewNotesByQuestionId,
      mistakeReasonsByQuestionId,
      rubricRatingsByQuestionId,
      updatedAt: Date.now(),
    });
  }, [
    activeQuestionId,
    answers,
    draftLoaded,
    elapsedSeconds,
    flaggedQuestionIds,
    mistakeReasonsByQuestionId,
    reviewNotesByQuestionId,
    rubricRatingsByQuestionId,
    showResults,
    unit.id,
  ]);

  useEffect(() => {
    if (!draftLoaded) return;

    // Capture the loaded value on the first pass so a resumed draft (results already revealed)
    // is not re-recorded on reload — only a fresh false→true reveal counts as a new attempt.
    if (prevShowResultsRef.current === null) {
      prevShowResultsRef.current = showResults;
      return;
    }

    if (prevShowResultsRef.current === false && showResults) {
      const report = buildPracticeReviewReport({
        questions: unit.questions,
        answers,
        showResults: true,
        flaggedQuestionIds,
        reviewNotesByQuestionId,
        rubricRatingsByQuestionId,
        elapsedSeconds,
      });

      if (report.score.answered > 0) {
        appendPracticeSessionHistoryEntry(
          buildPracticeSessionHistoryEntry({
            unit,
            report,
            elapsedSeconds,
            recordedAt: Date.now(),
            answers,
          })
        );
      }
    }

    prevShowResultsRef.current = showResults;
  }, [
    answers,
    draftLoaded,
    elapsedSeconds,
    flaggedQuestionIds,
    reviewNotesByQuestionId,
    rubricRatingsByQuestionId,
    showResults,
    unit,
  ]);

  const handleSelectQuestion = (questionId: string) => {
    setActiveQuestionId(questionId);
    document.getElementById(`question-${questionId}`)?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  };

  const handleAnswer = (questionId: string, answer: string) => {
    setAnswers((current) => ({ ...current, [questionId]: answer }));
    setActiveQuestionId(questionId);
  };

  const handleToggleFlag = (questionId: string) => {
    setFlaggedQuestionIds((current) =>
      current.includes(questionId)
        ? current.filter((id) => id !== questionId)
        : [...current, questionId]
    );
    setActiveQuestionId(questionId);
  };

  const handleReviewNote = (questionId: string, note: string) => {
    setReviewNotesByQuestionId((current) => {
      const trimmed = note.trimStart();
      if (!trimmed) {
        const next = { ...current };
        delete next[questionId];
        return next;
      }

      return { ...current, [questionId]: trimmed };
    });
  };

  const handleToggleMistakeReason = (questionId: string, reason: string) => {
    setMistakeReasonsByQuestionId((current) => {
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
    });
  };

  const handleRubricRating = (questionId: string, criterion: string, rating: number) => {
    setRubricRatingsByQuestionId((current) => ({
      ...current,
      [questionId]: {
        ...(current[questionId] ?? {}),
        [criterion]: rating,
      },
    }));
  };

  const handleReviewUnanswered = () => {
    const nextQuestion = unansweredQuestions[0] ?? unit.questions.find((question) => flaggedQuestionIds.includes(question.id));
    if (nextQuestion) {
      handleSelectQuestion(nextQuestion.id);
      return;
    }

    setShowResults(true);
  };

  const handleAddAnnotation = (annotation: Omit<PassageAnnotation, 'id'>) => {
    setAnnotations((current) => [
      ...current,
      {
        ...annotation,
        id: `${annotation.paragraphIndex}-${current.length + 1}-${annotation.text.slice(0, 12)}`,
      },
    ]);
  };

  const handleRemoveAnnotation = (annotationId: string) => {
    setAnnotations((current) => current.filter((annotation) => annotation.id !== annotationId));
  };

  const handleUpdateAnnotation = (annotationId: string, patch: Partial<Pick<PassageAnnotation, 'kind' | 'note'>>) => {
    setAnnotations((current) =>
      current.map((annotation) =>
        annotation.id === annotationId
          ? {
              ...annotation,
              ...patch,
            }
          : annotation
      )
    );
  };

  const handleClearAnnotations = () => {
    setAnnotations([]);
  };

  // Replace the whole set — used only to hydrate from a cloud backup when local is empty.
  const handleRestoreAnnotations = (restored: PassageAnnotation[]) => {
    setAnnotations(restored);
  };

  const handleResetPreview = () => {
    setAnswers({});
    setShowResults(false);
    setFlaggedQuestionIds([]);
    setReviewNotesByQuestionId({});
    setMistakeReasonsByQuestionId({});
    setRubricRatingsByQuestionId({});
    setElapsedSeconds(0);
    setActiveQuestionId(unit.questions[0]?.id ?? '');
    setAutoSubmitted(false);
  };

  const handleStartExam = () => {
    setAnswers({});
    setShowResults(false);
    setFlaggedQuestionIds([]);
    setReviewNotesByQuestionId({});
    setMistakeReasonsByQuestionId({});
    setRubricRatingsByQuestionId({});
    setElapsedSeconds(0);
    setActiveQuestionId(unit.questions[0]?.id ?? '');
    setAutoSubmitted(false);
    setExamMode(true);
  };

  const handleExitExam = () => {
    setExamMode(false);
    setAutoSubmitted(false);
  };

  const handleExamExpire = () => {
    setAutoSubmitted(true);
    setShowResults(true);
  };

  const handleClearLocalData = () => {
    if (!window.confirm('清空这个 Session 的本地答案、标记、复盘笔记和材料标注？此操作不会影响数据库。')) return;

    setAnswers({});
    setShowResults(false);
    setFlaggedQuestionIds([]);
    setReviewNotesByQuestionId({});
    setMistakeReasonsByQuestionId({});
    setRubricRatingsByQuestionId({});
    setAnnotations([]);
    setElapsedSeconds(0);
    setActiveQuestionId(unit.questions[0]?.id ?? '');
    clearPracticeSessionDraft(unit.id);
    clearPracticeSessionAnnotations(unit.id);
  };

  return {
    answers,
    activeIndex,
    activeQuestionId,
    annotations,
    annotationsLoaded,
    autoSubmitted,
    elapsedSeconds,
    examDurationSeconds,
    examMode,
    flaggedCount,
    flaggedQuestionIds,
    mistakeReasonsByQuestionId,
    reviewNotesByQuestionId,
    rubricRatingsByQuestionId,
    score,
    showResults,
    unansweredQuestions,
    setElapsedSeconds,
    setShowResults,
    handleAddAnnotation,
    handleAnswer,
    handleClearAnnotations,
    handleClearLocalData,
    handleExamExpire,
    handleExitExam,
    handleRemoveAnnotation,
    handleResetPreview,
    handleRestoreAnnotations,
    handleReviewNote,
    handleRubricRating,
    handleReviewUnanswered,
    handleSelectQuestion,
    handleStartExam,
    handleToggleFlag,
    handleToggleMistakeReason,
    handleUpdateAnnotation,
  };
}
