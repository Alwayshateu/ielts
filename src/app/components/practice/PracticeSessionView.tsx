'use client';

import Link from 'next/link';
import { motion } from 'motion/react';
import { ArrowLeft, BookOpenText, Headphones, ListChecks, Microphone, PenNib } from '@phosphor-icons/react';
import type { PracticeUnit } from '@/lib/types';
import { riseChild, staggerParent } from '../ui/motion-presets';
import AnswerSheet from './AnswerSheet';
import MaterialPane from './MaterialPane';
import QuestionNavigator from './QuestionNavigator';
import SessionControlBar from './SessionControlBar';
import ResultInspector from './ResultInspector';
import { usePracticeAnnotationSync } from './usePracticeAnnotationSync';
import { usePracticeSessionState } from './usePracticeSessionState';

function getSessionMeta(unit: PracticeUnit) {
  if (unit.skill === 'listening') {
    return {
      Icon: Headphones,
      label: 'Listening Session MVP',
      title: '一段音频，一组关联题。',
      description: '这是未来 Listening Session 的只读预览：左侧保留音频占位与 Transcript，右侧处理同一 section 下的题组。当前不会提交数据库。',
    };
  }

  if (unit.skill === 'writing') {
    return {
      Icon: PenNib,
      label: 'Writing Task MVP',
      title: '一个 Task，一份完整回应。',
      description: '这是未来 Writing Session 的只读预览：左侧保留 Task prompt 与 rubric 方向，右侧写本地草稿。当前不会提交数据库。',
    };
  }

  if (unit.skill === 'speaking') {
    return {
      Icon: Microphone,
      label: 'Speaking Session MVP',
      title: '一张 cue card，一次限时表达。',
      description: '这是未来 Speaking Session 的只读预览：左侧保留 cue card 与准备要求，右侧记录回答要点或自评。当前不会提交数据库。',
    };
  }

  return {
    Icon: BookOpenText,
    label: 'Reading Session MVP',
    title: '一篇材料，多道关联题。',
    description: '这是未来 Practice Session 的只读预览：左侧保留完整 Passage，右侧处理同一材料下的题组。当前不会提交数据库。',
  };
}

export default function PracticeSessionView({ unit }: { unit: PracticeUnit }) {
  const {
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
  } = usePracticeSessionState(unit);
  const annotationSync = usePracticeAnnotationSync({
    unitSlug: unit.slug,
    annotations,
    annotationsLoaded,
    onRestore: handleRestoreAnnotations,
  });
  const sessionMeta = getSessionMeta(unit);
  const SessionIcon = sessionMeta.Icon;

  return (
    <main className="mx-auto min-h-[100dvh] max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <motion.div variants={staggerParent(0.06)} initial="hidden" animate="show">
        <motion.header variants={riseChild} className="mb-6 grid gap-5 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <Link
                href="/practice/sessions"
                className="inline-flex items-center gap-2 rounded-full border border-line bg-white/80 px-3 py-1.5 text-sm font-medium text-ink-muted transition-all hover:-translate-y-0.5 hover:border-accent/25 hover:text-ink active:scale-[0.98]"
              >
                <ArrowLeft size={17} weight="bold" />
                返回 Session Library
              </Link>
              <span className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1.5 text-xs font-semibold text-ink-subtle">
                <SessionIcon size={14} weight="regular" />
                {sessionMeta.label}
              </span>
            </div>
            <h1 className="text-display max-w-3xl text-3xl font-semibold text-ink sm:text-4xl">
              {sessionMeta.title}
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink-subtle">
              {sessionMeta.description}
            </p>
          </div>

          <div className="rounded-[1.5rem] border border-white/70 bg-[#2d1b33] p-5 text-white shadow-[0_24px_70px_-48px_rgba(45,27,51,0.95)]">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10 text-white">
                <ListChecks size={20} weight="regular" />
              </span>
              <div>
                <p className="text-xs font-semibold tracking-[0.12em] text-white/55">CURRENT TASK</p>
                <p className="mt-1 text-sm font-semibold text-white">Question {activeIndex + 1} / {unit.questions.length}</p>
              </div>
            </div>
          </div>
        </motion.header>

        <SessionControlBar
          unit={unit}
          score={score}
          showResults={showResults}
          elapsedSeconds={elapsedSeconds}
          unansweredCount={unansweredQuestions.length}
          flaggedCount={flaggedCount}
          examMode={examMode}
          examDurationSeconds={examDurationSeconds}
          autoSubmitted={autoSubmitted}
          onElapsedChange={setElapsedSeconds}
          onReveal={() => setShowResults(true)}
          onReviewUnanswered={handleReviewUnanswered}
          onReset={handleResetPreview}
          onStartExam={handleStartExam}
          onExitExam={handleExitExam}
          onExamExpire={handleExamExpire}
        />

        <motion.div variants={riseChild} className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <MaterialPane
            unit={unit}
            annotations={annotations}
            onAddAnnotation={handleAddAnnotation}
            onUpdateAnnotation={handleUpdateAnnotation}
            onRemoveAnnotation={handleRemoveAnnotation}
            onClearAnnotations={handleClearAnnotations}
            annotationSync={annotationSync}
          />

          <section className="space-y-5 lg:col-span-7">
            <QuestionNavigator
              questions={unit.questions}
              answers={answers}
              activeQuestionId={activeQuestionId}
              showResults={showResults}
              flaggedQuestionIds={flaggedQuestionIds}
              reviewNotesByQuestionId={reviewNotesByQuestionId}
              onSelect={handleSelectQuestion}
            />
            <AnswerSheet
              questions={unit.questions}
              answers={answers}
              activeQuestionId={activeQuestionId}
              showResults={showResults}
              flaggedQuestionIds={flaggedQuestionIds}
              reviewNotesByQuestionId={reviewNotesByQuestionId}
              mistakeReasonsByQuestionId={mistakeReasonsByQuestionId}
              rubricRatingsByQuestionId={rubricRatingsByQuestionId}
              onAnswer={handleAnswer}
              onToggleFlag={handleToggleFlag}
              onReviewNote={handleReviewNote}
              onToggleMistakeReason={handleToggleMistakeReason}
              onRubricRating={handleRubricRating}
            />
            <ResultInspector
              questions={unit.questions}
              answers={answers}
              showResults={showResults}
              flaggedQuestionIds={flaggedQuestionIds}
              reviewNotesByQuestionId={reviewNotesByQuestionId}
              rubricRatingsByQuestionId={rubricRatingsByQuestionId}
              annotationCount={annotations.length}
              elapsedSeconds={elapsedSeconds}
              onReveal={() => setShowResults(true)}
              onEditAnswers={() => setShowResults(false)}
              onReset={handleResetPreview}
              onClearLocalData={handleClearLocalData}
              onSelectQuestion={handleSelectQuestion}
            />
          </section>
        </motion.div>
      </motion.div>
    </main>
  );
}
