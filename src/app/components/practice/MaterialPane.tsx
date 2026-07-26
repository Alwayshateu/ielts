'use client';

import { useEffect, useMemo, useState } from 'react';
import type { PassageAnnotation, PracticeUnit } from '@/lib/types';
import type { AnnotationSyncStatus } from './usePracticeAnnotationSync';
import { formatDifficulty } from '@/lib/question-labels';
import { parseTranscriptCues } from '@/lib/practice-listening-cues';
import { BookOpenText, Clock, FileText } from '@phosphor-icons/react';
import { annotationSyncCopy, formatMetadataSeconds, formatMetadataValue, formatMinutes, getMaterialText } from './material-pane/format';
import { getUnitAssetUrl } from './material-pane/media';
import { getSelectionInParagraph, hasOverlap, type PendingSelection } from './material-pane/selection';
import { getMaterialMeta } from './material-pane/material-meta';
import { AnnotatedParagraph } from './material-pane/AnnotatedParagraph';
import { ListeningAudioPlayer } from './material-pane/ListeningAudioPlayer';
import { SpeakingRecorder } from './material-pane/SpeakingRecorder';
import { SpeakingTimerShell } from './material-pane/SpeakingTimerShell';
import { GuidancePanel } from './material-pane/GuidancePanel';
import { MetaChip } from './material-pane/MetaChip';

export default function MaterialPane({
  unit,
  annotations,
  onAddAnnotation,
  onUpdateAnnotation,
  onRemoveAnnotation,
  onClearAnnotations,
  annotationSync,
}: {
  unit: PracticeUnit;
  annotations: PassageAnnotation[];
  onAddAnnotation: (annotation: Omit<PassageAnnotation, 'id'>) => void;
  onUpdateAnnotation: (annotationId: string, patch: Partial<Pick<PassageAnnotation, 'kind' | 'note'>>) => void;
  onRemoveAnnotation: (annotationId: string) => void;
  onClearAnnotations: () => void;
  annotationSync?: { enabled: boolean; status: AnnotationSyncStatus; restoredCount: number };
}) {
  const materialText = getMaterialText(unit);
  const assetUrl = getUnitAssetUrl(unit);
  const paragraphs = useMemo(() => materialText.split('\n\n').filter(Boolean), [materialText]);
  const transcriptCues = useMemo(() => parseTranscriptCues(unit.metadata?.transcriptCues), [unit.metadata?.transcriptCues]);
  const materialMeta = getMaterialMeta(unit);
  const MaterialIcon = materialMeta.Icon;
  const [pendingSelection, setPendingSelection] = useState<PendingSelection | null>(null);
  const [noteDraft, setNoteDraft] = useState('');
  const [menuMode, setMenuMode] = useState<'actions' | 'note'>('actions');
  const [selectionMessage, setSelectionMessage] = useState<string | null>(null);
  const [editingAnnotationId, setEditingAnnotationId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState('');
  const [prepRemainingSeconds, setPrepRemainingSeconds] = useState(
    typeof unit.metadata?.prepSeconds === 'number' ? unit.metadata.prepSeconds : 60
  );
  const [responseRemainingSeconds, setResponseRemainingSeconds] = useState(
    typeof unit.metadata?.responseSeconds === 'number' ? unit.metadata.responseSeconds : 120
  );
  const [timerMode, setTimerMode] = useState<'idle' | 'prep' | 'response'>('idle');
  const editingAnnotation = annotations.find((annotation) => annotation.id === editingAnnotationId) ?? null;

  useEffect(() => {
    if (timerMode === 'idle') return;

    const timer = window.setInterval(() => {
      if (timerMode === 'prep') {
        setPrepRemainingSeconds((current) => {
          if (current <= 1) {
            setTimerMode('response');
            return 0;
          }
          return current - 1;
        });
        return;
      }

      setResponseRemainingSeconds((current) => {
        if (current <= 1) {
          setTimerMode('idle');
          return 0;
        }
        return current - 1;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [timerMode]);

  const resetSpeakingTimers = () => {
    setPrepRemainingSeconds(typeof unit.metadata?.prepSeconds === 'number' ? unit.metadata.prepSeconds : 60);
    setResponseRemainingSeconds(typeof unit.metadata?.responseSeconds === 'number' ? unit.metadata.responseSeconds : 120);
    setTimerMode('idle');
  };

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setPendingSelection(null);
        setMenuMode('actions');
        setSelectionMessage(null);
        setEditingAnnotationId(null);
        setEditDraft('');
      }
    };

    const handlePointer = (event: PointerEvent) => {
      const target = event.target as Element | null;
      if (!target?.closest('[data-annotation-menu]')) {
        setPendingSelection(null);
        setMenuMode('actions');
      }
    };

    window.addEventListener('keydown', handleKey);
    window.addEventListener('pointerdown', handlePointer);
    window.addEventListener('resize', handleKey as EventListener);

    return () => {
      window.removeEventListener('keydown', handleKey);
      window.removeEventListener('pointerdown', handlePointer);
      window.removeEventListener('resize', handleKey as EventListener);
    };
  }, []);

  const openSelectionMenu = (x: number, y: number) => {
    if (editingAnnotationId) return;

    const selection = getSelectionInParagraph();
    if (!selection) return;

    setPendingSelection({ ...selection, x, y });
    setEditingAnnotationId(null);
    setMenuMode('actions');
    setNoteDraft('');
    setSelectionMessage(null);
  };

  const handleContextMenu = (event: React.MouseEvent<HTMLElement>) => {
    const selection = getSelectionInParagraph();
    if (!selection) return;

    event.preventDefault();
    openSelectionMenu(event.clientX, event.clientY);
  };

  const handleSelectionRelease = () => {
    window.setTimeout(() => {
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed || selection.rangeCount === 0) return;

      const rangeRect = selection.getRangeAt(0).getBoundingClientRect();
      if (rangeRect.width === 0 && rangeRect.height === 0) return;

      openSelectionMenu(rangeRect.left + rangeRect.width / 2, Math.max(12, rangeRect.top - 8));
    }, 80);
  };

  const createAnnotation = (kind: PassageAnnotation['kind'], note: string | null) => {
    if (!pendingSelection) return;

    const nextAnnotation = {
      paragraphIndex: pendingSelection.paragraphIndex,
      startOffset: pendingSelection.startOffset,
      endOffset: pendingSelection.endOffset,
      text: pendingSelection.text,
      kind,
      note,
    };

    if (hasOverlap(annotations, nextAnnotation)) {
      setSelectionMessage('这个位置已经有标注，先删除旧标注再添加新的。');
      return;
    }

    onAddAnnotation(nextAnnotation);
    window.getSelection()?.removeAllRanges();
    setPendingSelection(null);
    setMenuMode('actions');
    setNoteDraft('');
  };

  const startEditingAnnotation = (annotation: PassageAnnotation) => {
    setEditingAnnotationId(annotation.id);
    setEditDraft(annotation.note ?? '');
    setPendingSelection(null);
  };

  const saveEditingAnnotation = () => {
    if (!editingAnnotation) return;

    const note = editDraft.trim();
    onUpdateAnnotation(editingAnnotation.id, {
      kind: note ? 'note' : 'highlight',
      note: note || null,
    });
    setEditingAnnotationId(null);
    setEditDraft('');
  };

  const noteCount = annotations.filter((annotation) => annotation.kind === 'note').length;
  const highlightCount = annotations.filter((annotation) => annotation.kind === 'highlight').length;

  return (
    <aside className="lg:col-span-5">
      <div className="sticky top-6 overflow-hidden rounded-[2rem] border border-line bg-surface shadow-[inset_0_1px_0_rgba(255,255,255,0.78),0_22px_58px_-38px_rgba(24,24,27,0.36)]">
        <div className="relative overflow-hidden border-b border-line bg-ink p-6 text-white">
          <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-white/10 blur-3xl" aria-hidden="true" />
          <div className="relative">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-3 py-1 text-xs font-semibold text-white/65">
              <MaterialIcon size={14} weight="regular" />
              {materialMeta.label}
            </span>
            <h1 className="text-display mt-5 text-3xl font-semibold">{unit.title}</h1>
            <p className="mt-3 text-sm leading-relaxed text-white/60">{unit.description}</p>
            <div className="mt-5 grid grid-cols-3 gap-2">
              <MetaChip icon={BookOpenText} label="模式" value={unit.mode === 'progressive' ? 'Progressive' : unit.mode === 'challenge' ? 'Challenge' : 'Basic'} />
              <MetaChip icon={FileText} label="难度" value={formatDifficulty(unit.difficulty)} />
              <MetaChip icon={Clock} label="建议" value={formatMinutes(unit.time_limit_seconds)} />
            </div>
            <p className="mt-4 rounded-2xl border border-white/10 bg-white/[0.06] px-3 py-2 text-xs leading-relaxed text-white/55">
              选中 {materialMeta.hintTarget} 文字后可以 highlight 或添加 note。当前标注
              {highlightCount + noteCount} 条
              {annotationSync?.enabled
                ? annotationSyncCopy(annotationSync)
                : '，只保存在本机浏览器，不会写入数据库。'}
            </p>
          </div>
        </div>

        <div className="max-h-[68dvh] overflow-y-auto px-5 py-6 sm:px-6" onScroll={() => setPendingSelection(null)}>
          {materialMeta.emptyLabel && materialMeta.emptyDescription && (
            <div className={`mb-5 rounded-[1.5rem] border p-4 text-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.78)] ${
              materialMeta.tone === 'sky'
                ? 'border-sky-200 bg-sky-50 text-sky-900'
                : materialMeta.tone === 'amber'
                  ? 'border-amber-200 bg-amber-50 text-amber-900'
                  : 'border-rose-200 bg-rose-50 text-rose-900'
            }`}>
              <div className="flex items-start gap-3">
                <span className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-white ${
                  materialMeta.tone === 'sky' ? 'text-sky-700' : materialMeta.tone === 'amber' ? 'text-amber-700' : 'text-rose-700'
                }`}>
                  <MaterialIcon size={18} weight="regular" />
                </span>
                <div>
                  <p className="font-semibold">{materialMeta.emptyLabel}</p>
                  <p className={`mt-1 text-xs leading-relaxed ${
                    materialMeta.tone === 'sky' ? 'text-sky-700/75' : materialMeta.tone === 'amber' ? 'text-amber-700/75' : 'text-rose-700/75'
                  }`}>
                    {materialMeta.emptyDescription}
                  </p>
                </div>
              </div>
            </div>
          )}
          {unit.material_type === 'audio' && (
            <ListeningAudioPlayer
              audioUrl={unit.audio_url}
              cues={transcriptCues}
              transcriptParagraphs={paragraphs.length}
              fallbackDurationSeconds={
                typeof unit.metadata?.audioDurationSeconds === 'number' ? unit.metadata.audioDurationSeconds : null
              }
            />
          )}

          {unit.material_type === 'writing_prompt' && (
            <GuidancePanel
              tone="amber"
              items={[
                { label: 'Task', value: formatMetadataValue(unit.metadata?.taskType, 'task_2').replace('_', ' ').toUpperCase() },
                { label: 'Target', value: `${formatMetadataValue(unit.metadata?.wordTarget, '250')} words` },
                { label: 'Focus', value: 'position + balance' },
              ]}
              description="先把 prompt、立场和两边观点拆清楚，再去右侧写完整 response。这里是本地草稿，后续才会接 rubric feedback。"
            />
          )}

          {unit.material_type === 'speaking_prompt' && (
            <>
              <GuidancePanel
                tone="rose"
                items={[
                  { label: 'Part', value: `Part ${formatMetadataValue(unit.metadata?.part, '2')}` },
                  { label: 'Prep', value: formatMetadataSeconds(unit.metadata?.prepSeconds) },
                  { label: 'Speak', value: formatMetadataSeconds(unit.metadata?.responseSeconds) },
                ]}
                description="先用 60 秒准备关键词，再尝试完整说 1-2 分钟。右侧可以记录关键词、复盘 transcript 或自评。"
              />
              <SpeakingTimerShell
                timerMode={timerMode}
                prepRemainingSeconds={prepRemainingSeconds}
                responseRemainingSeconds={responseRemainingSeconds}
                onStartPrep={() => setTimerMode('prep')}
                onStartResponse={() => setTimerMode('response')}
                onPause={() => setTimerMode('idle')}
                onReset={resetSpeakingTimers}
              />
              <SpeakingRecorder />
            </>
          )}

          {assetUrl && (
            <figure className="mb-5 overflow-hidden rounded-[1.5rem] border border-line bg-white">
              {/* Signed Storage URLs are external and time-limited, so the next/image optimizer is a poor fit — render directly. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={assetUrl} alt={`${unit.title} 参考图`} className="w-full object-contain" />
              <figcaption className="border-t border-line px-4 py-2 text-xs text-ink-subtle">参考图 · 仅供练习使用</figcaption>
            </figure>
          )}

          <div
            className="space-y-5 text-sm leading-7 text-ink-muted"
            onContextMenu={handleContextMenu}
            onMouseUp={handleSelectionRelease}
            onTouchEnd={handleSelectionRelease}
          >
            {paragraphs.map((paragraph, index) => (
              <p key={index} data-passage-paragraph={index} className="selection:bg-amber-200/70 selection:text-ink">
                <AnnotatedParagraph
                  paragraph={paragraph}
                  paragraphIndex={index}
                  annotations={annotations}
                  onSelectAnnotation={startEditingAnnotation}
                />
              </p>
            ))}
          </div>

          {annotations.length > 0 && (
            <div className="mt-6 rounded-[1.5rem] border border-line bg-zinc-50 p-4">
              <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-ink">本地 {materialMeta.annotationTitle}</p>
                  <p className="mt-0.5 text-xs text-ink-subtle">{highlightCount} highlights · {noteCount} notes</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm('清空本机保存的 Passage 标注？此操作不会影响答案。')) {
                      onClearAnnotations();
                    }
                  }}
                  className="w-fit rounded-full border border-line bg-surface px-3 py-1.5 text-xs font-semibold text-ink-subtle transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600 active:scale-[0.98]"
                >
                  清空标注
                </button>
              </div>
              <div className="space-y-2">
                {annotations.map((annotation) => (
                  <div key={annotation.id} className="rounded-2xl border border-line bg-surface px-3 py-2 text-xs">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold text-ink">{annotation.kind === 'note' ? 'Note' : 'Highlight'} · P{annotation.paragraphIndex + 1}</p>
                        <p className="mt-1 line-clamp-2 leading-relaxed text-ink-muted">“{annotation.text}”</p>
                        {annotation.note && <p className="mt-1 leading-relaxed text-amber-700">{annotation.note}</p>}
                      </div>
                      <div className="flex shrink-0 flex-col gap-1.5">
                        <button
                          type="button"
                          onClick={() => startEditingAnnotation(annotation)}
                          className="rounded-full border border-line px-2 py-1 font-semibold text-ink-subtle transition-colors hover:border-accent/30 hover:bg-accent-tint hover:text-accent active:scale-[0.98]"
                        >
                          编辑
                        </button>
                        <button
                          type="button"
                          onClick={() => onRemoveAnnotation(annotation.id)}
                          className="rounded-full border border-line px-2 py-1 font-semibold text-ink-subtle transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600 active:scale-[0.98]"
                        >
                          删除
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {editingAnnotation && (
        <div className="fixed inset-0 z-20 flex items-end bg-zinc-950/18 px-4 py-6 backdrop-blur-[2px] sm:items-center sm:justify-center" data-annotation-menu>
          <div className="w-full max-w-md rounded-[1.75rem] border border-line bg-surface p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.82),0_30px_80px_-40px_rgba(24,24,27,0.42)]">
            <p className="text-sm font-semibold text-ink">编辑 {materialMeta.hintTarget} Note</p>
            <p className="mt-2 line-clamp-3 rounded-2xl bg-zinc-50 px-3 py-2 text-xs leading-relaxed text-ink-subtle">
              “{editingAnnotation.text}”
            </p>
            <label className="mt-4 block">
              <span className="mb-2 block text-xs font-semibold text-ink">Note 内容</span>
              <textarea
                value={editDraft}
                onChange={(event) => setEditDraft(event.target.value)}
                rows={4}
                autoFocus
                placeholder="留空保存会转为普通 highlight"
                className="w-full resize-none rounded-2xl border border-line bg-zinc-50 px-3 py-2 text-sm text-ink outline-none transition-all placeholder:text-ink-subtle focus:border-accent focus:bg-surface focus:ring-4 focus:ring-accent/10"
              />
            </label>
            <div className="mt-4 grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={saveEditingAnnotation}
                className="rounded-2xl bg-ink px-3 py-2 text-sm font-semibold text-white transition-all hover:bg-zinc-800 active:scale-[0.98]"
              >
                保存
              </button>
              <button
                type="button"
                onClick={() => {
                  onUpdateAnnotation(editingAnnotation.id, { kind: 'highlight', note: null });
                  setEditingAnnotationId(null);
                  setEditDraft('');
                }}
                className="rounded-2xl border border-line bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800 transition-all hover:bg-amber-100 active:scale-[0.98]"
              >
                转 Highlight
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditingAnnotationId(null);
                  setEditDraft('');
                }}
                className="rounded-2xl border border-line px-3 py-2 text-sm font-semibold text-ink-muted transition-all hover:bg-zinc-50 active:scale-[0.98]"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}

      {pendingSelection && (
        <div
          data-annotation-menu
          className="fixed z-20 w-72 rounded-[1.25rem] border border-line bg-surface p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.82),0_24px_60px_-34px_rgba(24,24,27,0.38)]"
          style={{ left: Math.min(pendingSelection.x, window.innerWidth - 304), top: Math.min(pendingSelection.y, window.innerHeight - 230) }}
        >
          <p className="line-clamp-2 text-xs leading-relaxed text-ink-subtle">“{pendingSelection.text}”</p>
          {selectionMessage && <p className="mt-2 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-700">{selectionMessage}</p>}

          {menuMode === 'actions' ? (
            <div className="mt-3 grid gap-2">
              <button
                type="button"
                onClick={() => createAnnotation('highlight', null)}
                className="rounded-2xl bg-amber-100 px-3 py-2 text-left text-sm font-semibold text-amber-800 transition-all hover:-translate-y-0.5 hover:bg-amber-200 active:scale-[0.98]"
              >
                Highlight 这段文字
              </button>
              <button
                type="button"
                onClick={() => setMenuMode('note')}
                className="rounded-2xl border border-line bg-zinc-50 px-3 py-2 text-left text-sm font-semibold text-ink-muted transition-all hover:-translate-y-0.5 hover:border-accent/30 hover:bg-accent-tint hover:text-accent active:scale-[0.98]"
              >
                添加 Note
              </button>
            </div>
          ) : (
            <div className="mt-3">
              <label className="block">
                <span className="mb-2 block text-xs font-semibold text-ink">Note 内容</span>
                <textarea
                  value={noteDraft}
                  onChange={(event) => setNoteDraft(event.target.value)}
                  rows={3}
                  autoFocus
                  placeholder="写下这段为什么重要..."
                  className="w-full resize-none rounded-2xl border border-line bg-zinc-50 px-3 py-2 text-sm text-ink outline-none transition-all placeholder:text-ink-subtle focus:border-accent focus:bg-surface focus:ring-4 focus:ring-accent/10"
                />
              </label>
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => createAnnotation('note', noteDraft.trim() || '需要复盘')}
                  className="flex-1 rounded-2xl bg-ink px-3 py-2 text-sm font-semibold text-white transition-all hover:bg-zinc-800 active:scale-[0.98]"
                >
                  保存
                </button>
                <button
                  type="button"
                  onClick={() => setMenuMode('actions')}
                  className="flex-1 rounded-2xl border border-line px-3 py-2 text-sm font-semibold text-ink-muted transition-all hover:bg-zinc-50 active:scale-[0.98]"
                >
                  返回
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </aside>
  );
}
