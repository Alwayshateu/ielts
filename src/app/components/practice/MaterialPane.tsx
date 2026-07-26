'use client';

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { PassageAnnotation, PracticeUnit } from '@/lib/types';
import type { AnnotationSyncStatus } from './usePracticeAnnotationSync';
import { formatDifficulty } from '@/lib/question-labels';
import {
  clampPlaybackTime,
  formatClock as formatAudioClock,
  parseTranscriptCues,
  resolveActiveCueIndex,
  type TranscriptCue,
} from '@/lib/practice-listening-cues';
import {
  ArrowCounterClockwise,
  BookOpenText,
  Clock,
  FastForward,
  FileText,
  Gauge,
  Headphones,
  LockSimple,
  Microphone,
  MicrophoneSlash,
  Pause,
  PenNib,
  Play,
  Record,
  Rewind,
  Stop,
  Timer,
  Trash,
  WarningCircle,
  Waveform,
} from '@phosphor-icons/react';

function formatMinutes(seconds: number | null) {
  if (!seconds) return '不限时';
  return `${Math.round(seconds / 60)} 分钟`;
}

type PendingSelection = {
  paragraphIndex: number;
  startOffset: number;
  endOffset: number;
  text: string;
  x: number;
  y: number;
};

function getParagraphElement(node: Node | null) {
  const element = node instanceof Element ? node : node?.parentElement;
  return element?.closest<HTMLElement>('[data-passage-paragraph]') ?? null;
}

function getTextOffset(container: HTMLElement, targetNode: Node, targetOffset: number) {
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
  let offset = 0;
  let current = walker.nextNode();

  while (current) {
    if (current === targetNode) {
      return offset + targetOffset;
    }

    offset += current.textContent?.length ?? 0;
    current = walker.nextNode();
  }

  return offset;
}

function getSelectionInParagraph() {
  const selection = window.getSelection();
  if (!selection || selection.isCollapsed || selection.rangeCount === 0) return null;

  const range = selection.getRangeAt(0);
  const startParagraph = getParagraphElement(range.startContainer);
  const endParagraph = getParagraphElement(range.endContainer);

  if (!startParagraph || !endParagraph || startParagraph !== endParagraph) return null;

  const paragraphIndex = Number(startParagraph.dataset.passageParagraph);
  if (Number.isNaN(paragraphIndex)) return null;

  const rawStart = getTextOffset(startParagraph, range.startContainer, range.startOffset);
  const rawEnd = getTextOffset(startParagraph, range.endContainer, range.endOffset);
  const startOffset = Math.min(rawStart, rawEnd);
  const endOffset = Math.max(rawStart, rawEnd);
  const text = startParagraph.textContent?.slice(startOffset, endOffset).trim() ?? '';

  if (!text) return null;

  return {
    paragraphIndex,
    startOffset,
    endOffset,
    text,
  };
}

function formatMetadataSeconds(value: unknown) {
  if (typeof value !== 'number') return '未设置';
  if (value < 60) return `${value} 秒`;
  return `${Math.round(value / 60)} 分钟`;
}

function formatTimer(seconds: number) {
  const safeSeconds = Math.max(0, seconds);
  const minutes = Math.floor(safeSeconds / 60);
  const remainingSeconds = safeSeconds % 60;

  return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
}

function formatMetadataValue(value: unknown, fallback = '未设置') {
  if (typeof value === 'number') return String(value);
  if (typeof value === 'string' && value.trim()) return value;
  return fallback;
}


function hasOverlap(annotations: PassageAnnotation[], next: Pick<PassageAnnotation, 'paragraphIndex' | 'startOffset' | 'endOffset'>) {
  return annotations.some(
    (annotation) =>
      annotation.paragraphIndex === next.paragraphIndex &&
      Math.max(annotation.startOffset, next.startOffset) < Math.min(annotation.endOffset, next.endOffset)
  );
}

function getMaterialText(unit: PracticeUnit) {
  return unit.passage_text ?? unit.transcript ?? String(unit.metadata?.prompt ?? unit.metadata?.cueCard ?? '');
}

function getMaterialMeta(unit: PracticeUnit) {
  if (unit.material_type === 'audio') {
    return {
      Icon: Headphones,
      label: 'Listening Section',
      hintTarget: 'Transcript',
      annotationTitle: 'Transcript 标注',
      emptyLabel: 'Audio placeholder',
      emptyDescription: '正式 Listening MVP 会接入 audio_url、播放进度和 transcript 同步。当前先用 transcript 预览“一段音频 + 多题组”的界面结构。',
      tone: 'sky',
    };
  }

  if (unit.material_type === 'writing_prompt') {
    return {
      Icon: PenNib,
      label: 'Writing Task',
      hintTarget: 'Prompt',
      annotationTitle: 'Prompt 标注',
      emptyLabel: 'Writing workspace preview',
      emptyDescription: '正式 Writing MVP 会接入字数目标、rubric、自评和反馈记录。当前先用本地草稿预览 Task response 流程。',
      tone: 'amber',
    };
  }

  if (unit.material_type === 'speaking_prompt') {
    return {
      Icon: Microphone,
      label: 'Speaking Session',
      hintTarget: 'Cue card',
      annotationTitle: 'Cue card 标注',
      emptyLabel: 'Speaking rehearsal preview',
      emptyDescription: '正式 Speaking MVP 会接入准备计时、录音、转写和反馈。当前先用文字要点预览 Part 2 回答流程。',
      tone: 'rose',
    };
  }

  return {
    Icon: BookOpenText,
    label: 'Reading Passage',
    hintTarget: 'Passage',
    annotationTitle: 'Passage 标注',
    emptyLabel: null,
    emptyDescription: null,
    tone: 'emerald',
  };
}

function annotationSyncCopy(sync: { status: AnnotationSyncStatus; restoredCount: number }): string {
  switch (sync.status) {
    case 'syncing':
      return '，正在同步到云端…';
    case 'error':
      return '，本机已保存，云端同步暂时失败，改动后会自动重试。';
    case 'synced':
      return sync.restoredCount > 0
        ? `，已与云端同步（含 ${sync.restoredCount} 条从云端恢复），换设备也能看到。`
        : '，已同步到云端，换设备也能看到。';
    default:
      return '，本机已保存，改动后会同步到云端。';
  }
}

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

function AnnotatedParagraph({
  paragraph,
  paragraphIndex,
  annotations,
  onSelectAnnotation,
}: {
  paragraph: string;
  paragraphIndex: number;
  annotations: PassageAnnotation[];
  onSelectAnnotation: (annotation: PassageAnnotation) => void;
}) {
  const paragraphAnnotations = annotations
    .filter((annotation) => annotation.paragraphIndex === paragraphIndex)
    .filter((annotation) => paragraph.slice(annotation.startOffset, annotation.endOffset) === annotation.text)
    .sort((a, b) => a.startOffset - b.startOffset);

  const parts: ReactNode[] = [];
  let cursor = 0;

  paragraphAnnotations.forEach((annotation) => {
    if (annotation.startOffset < cursor) return;

    if (annotation.startOffset > cursor) {
      parts.push(paragraph.slice(cursor, annotation.startOffset));
    }

    const className = annotation.kind === 'note'
      ? 'rounded-md bg-amber-100 px-0.5 text-amber-950 underline decoration-amber-500/70 decoration-dotted underline-offset-4'
      : 'rounded-md bg-yellow-200/80 px-0.5 text-ink';

    parts.push(
      <span
        key={annotation.id}
        role="button"
        tabIndex={0}
        className={`${className} cursor-pointer transition-shadow hover:shadow-[0_0_0_2px_rgba(245,158,11,0.25)] focus:outline-none focus:ring-2 focus:ring-amber-400/60`}
        title={annotation.note ?? 'Highlighted locally'}
        onClick={() => onSelectAnnotation(annotation)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            onSelectAnnotation(annotation);
          }
        }}
      >
        {annotation.text}
      </span>
    );

    cursor = annotation.endOffset;
  });

  if (cursor < paragraph.length) {
    parts.push(paragraph.slice(cursor));
  }

  return <>{parts}</>;
}

const PLAYBACK_RATES = [1, 1.25, 1.5, 0.75];

function ListeningAudioPlayer({
  audioUrl,
  cues,
  transcriptParagraphs,
  fallbackDurationSeconds,
}: {
  audioUrl: string | null;
  cues: TranscriptCue[];
  transcriptParagraphs: number;
  fallbackDurationSeconds: number | null;
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const activeCueRef = useRef<HTMLButtonElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(fallbackDurationSeconds ?? 0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [examOnce, setExamOnce] = useState(false);
  const [hasEnded, setHasEnded] = useState(false);
  const [showTranscript, setShowTranscript] = useState(true);

  const effectiveDuration = duration > 0 ? duration : fallbackDurationSeconds ?? 0;
  const activeIndex = resolveActiveCueIndex(cues, currentTime);
  const progressPercent = effectiveDuration > 0 ? Math.min(100, (currentTime / effectiveDuration) * 100) : 0;
  const playbackLocked = examOnce && hasEnded;

  useEffect(() => {
    if (activeIndex >= 0 && activeCueRef.current) {
      activeCueRef.current.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [activeIndex]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio || playbackLocked) return;
    if (audio.paused) {
      void audio.play();
    } else {
      audio.pause();
    }
  };

  const seekTo = (seconds: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    if (examOnce && seconds < currentTime) return; // no rewinding under the play-once exam lock
    const next = clampPlaybackTime(seconds, effectiveDuration || audio.duration || 0);
    audio.currentTime = next;
    setCurrentTime(next);
  };

  const cyclePlaybackRate = () => {
    const index = PLAYBACK_RATES.indexOf(playbackRate);
    const next = PLAYBACK_RATES[(index + 1) % PLAYBACK_RATES.length];
    setPlaybackRate(next);
    if (audioRef.current) audioRef.current.playbackRate = next;
  };

  const restart = () => {
    if (examOnce) return;
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = 0;
    setCurrentTime(0);
    setHasEnded(false);
    void audio.play();
  };

  if (!audioUrl) {
    return (
      <div className="mb-5 rounded-[1.5rem] border border-sky-200 bg-sky-50 p-4 text-sm text-sky-900">
        当前单元还没有 audio_url，接入后这里会出现可播放的 Listening section。
      </div>
    );
  }

  return (
    <div className="mb-5 rounded-[1.5rem] border border-sky-200 bg-sky-50 p-4 text-sky-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.78)]">
      <audio
        ref={audioRef}
        src={audioUrl}
        preload="metadata"
        onLoadedMetadata={(event) => {
          const el = event.currentTarget;
          if (Number.isFinite(el.duration) && el.duration > 0) setDuration(el.duration);
          el.playbackRate = playbackRate;
        }}
        onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => {
          setIsPlaying(false);
          setHasEnded(true);
        }}
      />

      <div className="flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-sky-700">
          <Waveform size={20} weight="regular" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-sm font-semibold">Listening 音频</p>
              <p className="mt-1 text-xs leading-relaxed text-sky-800/75">
                示例占位音轨（非真人朗读），用于演示播放器与同步字幕。字幕行会跟随进度高亮，可点击跳转。
              </p>
            </div>
            <button
              type="button"
              onClick={() => setExamOnce((value) => !value)}
              className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition-colors active:scale-[0.98] ${
                examOnce
                  ? 'border-sky-600 bg-sky-600 text-white'
                  : 'border-sky-200 bg-white text-sky-800 hover:border-sky-300'
              }`}
            >
              <LockSimple size={13} weight={examOnce ? 'fill' : 'regular'} />
              仅播一次
            </button>
          </div>

          <div className="mt-4 rounded-2xl border border-sky-200 bg-white p-3">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={togglePlay}
                disabled={playbackLocked}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-sky-700 text-white transition-all hover:bg-sky-800 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-sky-200"
                aria-label={isPlaying ? '暂停音频' : '播放音频'}
              >
                {isPlaying ? <Pause size={20} weight="fill" /> : <Play size={20} weight="fill" />}
              </button>
              <div className="min-w-0 flex-1">
                <input
                  type="range"
                  min={0}
                  max={effectiveDuration || 100}
                  step={0.1}
                  value={Math.min(currentTime, effectiveDuration || currentTime)}
                  disabled={examOnce}
                  onChange={(event) => seekTo(Number(event.target.value))}
                  className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-sky-100 accent-sky-600 disabled:cursor-not-allowed"
                  aria-label="播放进度"
                />
                <div className="mt-1.5 flex items-center justify-between text-[11px] font-semibold tabular-nums text-sky-800/65">
                  <span>{formatAudioClock(currentTime)}</span>
                  <span>{effectiveDuration > 0 ? formatAudioClock(effectiveDuration) : '--:--'}</span>
                </div>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <PlayerChip icon={Rewind} label="-10s" onClick={() => seekTo(currentTime - 10)} disabled={examOnce} />
              <PlayerChip icon={FastForward} label="+10s" onClick={() => seekTo(currentTime + 10)} />
              <PlayerChip icon={Gauge} label={`${playbackRate}x`} onClick={cyclePlaybackRate} />
              <PlayerChip icon={ArrowCounterClockwise} label="重听" onClick={restart} disabled={examOnce} />
            </div>

            <div className="mt-2 h-1 overflow-hidden rounded-full bg-sky-100">
              <div className="h-full rounded-full bg-sky-400 transition-all duration-200" style={{ width: `${progressPercent}%` }} />
            </div>
          </div>

          {playbackLocked && (
            <p className="mt-2 flex items-center gap-1.5 rounded-xl bg-white/70 px-3 py-2 text-[11px] font-semibold text-sky-800">
              <LockSimple size={13} weight="fill" />
              「仅播一次」已锁定：模拟真实考试，音频只播放一遍，无法重听或拖动。
            </p>
          )}

          {cues.length > 0 && (
            <div className="mt-3 rounded-2xl border border-sky-200 bg-white p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold text-sky-900">同步字幕 · {cues.length} 行</p>
                <button
                  type="button"
                  onClick={() => setShowTranscript((value) => !value)}
                  className="rounded-full border border-sky-200 px-2.5 py-1 text-[11px] font-semibold text-sky-700 transition-colors hover:border-sky-300 active:scale-[0.98]"
                >
                  {showTranscript ? '隐藏' : '显示'}
                </button>
              </div>
              {showTranscript && (
                <div className="mt-2 max-h-52 space-y-1 overflow-y-auto pr-1">
                  {cues.map((cue, index) => {
                    const active = index === activeIndex;
                    return (
                      <button
                        key={`${cue.start}-${index}`}
                        ref={active ? activeCueRef : undefined}
                        type="button"
                        onClick={() => seekTo(cue.start)}
                        disabled={examOnce}
                        className={`flex w-full items-start gap-2 rounded-xl px-2.5 py-2 text-left text-xs leading-relaxed transition-colors disabled:cursor-not-allowed ${
                          active
                            ? 'bg-sky-600 text-white'
                            : 'text-sky-900/80 hover:bg-sky-50'
                        }`}
                      >
                        <span className={`shrink-0 tabular-nums font-semibold ${active ? 'text-white/80' : 'text-sky-500'}`}>
                          {formatAudioClock(cue.start)}
                        </span>
                        <span>{cue.text}</span>
                      </button>
                    );
                  })}
                </div>
              )}
              <p className="mt-2 text-[11px] text-sky-800/60">
                下方完整 transcript（{transcriptParagraphs} 段）仍可 highlight / 加 note，用于听后复盘。
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function PlayerChip({
  icon: Icon,
  label,
  onClick,
  disabled = false,
}: {
  icon: typeof Rewind;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex items-center gap-1.5 rounded-full border border-sky-200 bg-white px-3 py-1.5 text-xs font-semibold text-sky-800 transition-colors hover:border-sky-300 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
    >
      <Icon size={13} weight="regular" />
      {label}
    </button>
  );
}

const SPEAKING_SELF_CRITERIA = [
  { id: 'fluency', label: 'Fluency' },
  { id: 'lexical', label: 'Lexical' },
  { id: 'grammar', label: 'Grammar' },
  { id: 'pronunciation', label: 'Pronunciation' },
];

function pickAudioMimeType() {
  if (typeof MediaRecorder === 'undefined') return '';
  const candidates = ['audio/webm', 'audio/mp4', 'audio/ogg'];
  return candidates.find((type) => MediaRecorder.isTypeSupported(type)) ?? '';
}

function SpeakingRecorder() {
  const [supported] = useState(
    () =>
      typeof navigator !== 'undefined' &&
      !!navigator.mediaDevices &&
      typeof navigator.mediaDevices.getUserMedia === 'function' &&
      typeof window !== 'undefined' &&
      typeof window.MediaRecorder !== 'undefined',
  );
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioUrlRef = useRef<string | null>(null);
  const startedAtRef = useRef(0);
  const [status, setStatus] = useState<'idle' | 'recording' | 'recorded'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [recordedSeconds, setRecordedSeconds] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [selfRating, setSelfRating] = useState<Record<string, number>>({});

  useEffect(() => {
    if (status !== 'recording') return;
    const timer = window.setInterval(() => setRecordingSeconds((value) => value + 1), 1000);
    return () => window.clearInterval(timer);
  }, [status]);

  useEffect(() => {
    return () => {
      if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  const stopStream = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  };

  const startRecording = async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mimeType = pickAudioMimeType();
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      chunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType || 'audio/webm' });
        if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
        const url = URL.createObjectURL(blob);
        audioUrlRef.current = url;
        setAudioUrl(url);
        setRecordedSeconds(Math.max(1, Math.round((Date.now() - startedAtRef.current) / 1000)));
        setStatus('recorded');
        stopStream();
      };

      recorderRef.current = recorder;
      recorder.start();
      startedAtRef.current = Date.now();
      setRecordingSeconds(0);
      setSelfRating({});
      setStatus('recording');
    } catch (caught) {
      const name = caught instanceof DOMException ? caught.name : '';
      setError(
        name === 'NotAllowedError' || name === 'SecurityError'
          ? '麦克风权限被拒绝。请在浏览器地址栏允许麦克风后重试。'
          : name === 'NotFoundError'
            ? '没有检测到可用的麦克风设备。'
            : '无法开始录音，请检查浏览器麦克风设置。',
      );
      stopStream();
      setStatus('idle');
    }
  };

  const stopRecording = () => {
    recorderRef.current?.stop();
  };

  const clearRecording = () => {
    if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
    audioUrlRef.current = null;
    setAudioUrl(null);
    setRecordedSeconds(0);
    setSelfRating({});
    setStatus('idle');
  };

  const ratedValues = Object.values(selfRating);
  const averageBand =
    ratedValues.length > 0 ? Math.round((ratedValues.reduce((sum, value) => sum + value, 0) / ratedValues.length) * 10) / 10 : null;

  return (
    <div className="mb-5 rounded-[1.5rem] border border-rose-200 bg-rose-50 p-4 text-rose-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.78)]">
      <div className="flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-rose-700">
          <Microphone size={20} weight="regular" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-sm font-semibold">Speaking 录音自评</p>
              <p className="mt-1 text-xs leading-relaxed text-rose-800/75">
                录下你的 Part 2 回答，回放并对照 band 描述符自评。录音只留在本机内存，不会上传或写数据库。
              </p>
            </div>
            {status === 'recording' && (
              <span className="flex items-center gap-1.5 rounded-full bg-rose-600 px-3 py-1 text-xs font-semibold text-white">
                <span className="h-2 w-2 animate-pulse rounded-full bg-white" />
                REC {formatTimer(recordingSeconds)}
              </span>
            )}
          </div>

          {!supported ? (
            <div className="mt-4 flex items-start gap-2 rounded-2xl border border-rose-200 bg-white px-3 py-3 text-xs text-rose-800">
              <MicrophoneSlash size={16} weight="regular" className="mt-0.5 shrink-0" />
              <span>当前浏览器不支持 MediaRecorder 录音。可改用系统录音工具，仍能在下方做 band 自评。</span>
            </div>
          ) : (
            <>
              <div className="mt-4 flex flex-wrap gap-2">
                {status !== 'recording' ? (
                  <button
                    type="button"
                    onClick={startRecording}
                    className="flex items-center gap-2 rounded-2xl bg-rose-700 px-4 py-2.5 text-sm font-semibold text-white transition-all hover:bg-rose-800 active:scale-[0.98]"
                  >
                    <Record size={17} weight="fill" />
                    {status === 'recorded' ? '重新录音' : '开始录音'}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={stopRecording}
                    className="flex items-center gap-2 rounded-2xl bg-rose-900 px-4 py-2.5 text-sm font-semibold text-white transition-all hover:bg-black active:scale-[0.98]"
                  >
                    <Stop size={17} weight="fill" />
                    停止录音
                  </button>
                )}
                {status === 'recorded' && audioUrl && (
                  <button
                    type="button"
                    onClick={clearRecording}
                    className="flex items-center gap-2 rounded-2xl border border-rose-200 bg-white px-4 py-2.5 text-sm font-semibold text-rose-800 transition-all hover:bg-rose-100 active:scale-[0.98]"
                  >
                    <Trash size={16} weight="regular" />
                    清除
                  </button>
                )}
              </div>

              {error && (
                <p className="mt-3 flex items-start gap-2 rounded-2xl border border-rose-300 bg-white px-3 py-2 text-xs font-semibold text-rose-700">
                  <WarningCircle size={15} weight="fill" className="mt-0.5 shrink-0" />
                  {error}
                </p>
              )}

              {status === 'recorded' && audioUrl && (
                <div className="mt-3 rounded-2xl border border-rose-200 bg-white p-3">
                  <p className="mb-2 text-xs font-semibold text-rose-900">
                    回放 · 时长约 {formatTimer(recordedSeconds)}
                  </p>
                  <audio src={audioUrl} controls className="w-full" />
                </div>
              )}
            </>
          )}

          <div className="mt-3 rounded-2xl border border-rose-200 bg-white p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold text-rose-900">结合录音自评（本地）</p>
              <span className="text-xs font-semibold tabular-nums text-rose-700">
                {averageBand !== null ? `均分 ${averageBand}` : '未评'}
              </span>
            </div>
            <div className="mt-3 grid gap-2">
              {SPEAKING_SELF_CRITERIA.map((criterion) => (
                <div key={criterion.id} className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-rose-900/80">{criterion.label}</span>
                  <div className="flex gap-1.5">
                    {[5, 6, 7, 8].map((band) => (
                      <button
                        key={band}
                        type="button"
                        onClick={() => setSelfRating((current) => ({ ...current, [criterion.id]: band }))}
                        className={`h-7 w-7 rounded-full border text-[11px] font-semibold transition-all active:scale-[0.98] ${
                          selfRating[criterion.id] === band
                            ? 'border-rose-700 bg-rose-700 text-white'
                            : 'border-rose-200 bg-rose-50 text-rose-700 hover:border-rose-300'
                        }`}
                      >
                        {band}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-3 text-[11px] leading-relaxed text-rose-800/60">
              这是练习时的即时自检；提交 session 后，答题卡里还有可保存的 4 项 band 自评会写入复盘轨迹。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function SpeakingTimerShell({
  timerMode,
  prepRemainingSeconds,
  responseRemainingSeconds,
  onStartPrep,
  onStartResponse,
  onPause,
  onReset,
}: {
  timerMode: 'idle' | 'prep' | 'response';
  prepRemainingSeconds: number;
  responseRemainingSeconds: number;
  onStartPrep: () => void;
  onStartResponse: () => void;
  onPause: () => void;
  onReset: () => void;
}) {
  return (
    <div className="mb-5 rounded-[1.5rem] border border-rose-200 bg-rose-50 p-4 text-rose-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.78)]">
      <div className="flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-rose-700">
          <Timer size={20} weight="regular" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">Speaking rehearsal timer</p>
          <p className="mt-1 text-xs leading-relaxed text-rose-800/75">
            本地计时器用于模拟 Part 2：先准备，再完整表达。不会录音，也不会写数据库。
          </p>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <TimerCard active={timerMode === 'prep'} label="Prep" value={formatTimer(prepRemainingSeconds)} />
            <TimerCard active={timerMode === 'response'} label="Response" value={formatTimer(responseRemainingSeconds)} />
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <TimerButton onClick={onStartPrep} label="开始准备" />
            <TimerButton onClick={onStartResponse} label="开始回答" />
            <TimerButton onClick={onPause} label="暂停" variant="light" />
            <TimerButton onClick={onReset} label="重置" variant="light" />
          </div>
        </div>
      </div>
    </div>
  );
}

function TimerCard({ active, label, value }: { active: boolean; label: string; value: string }) {
  return (
    <div className={`rounded-2xl border px-3 py-2 ${active ? 'border-rose-300 bg-white text-rose-900 shadow-sm' : 'border-rose-200 bg-white/70 text-rose-800/70'}`}>
      <p className="text-[11px] font-semibold opacity-65">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}

function TimerButton({
  onClick,
  label,
  variant = 'solid',
}: {
  onClick: () => void;
  label: string;
  variant?: 'solid' | 'light';
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={variant === 'solid'
        ? 'rounded-2xl bg-rose-700 px-3 py-2 text-xs font-semibold text-white transition-all hover:bg-rose-800 active:scale-[0.98]'
        : 'rounded-2xl border border-rose-200 bg-white px-3 py-2 text-xs font-semibold text-rose-800 transition-all hover:bg-rose-100 active:scale-[0.98]'}
    >
      {label}
    </button>
  );
}

function GuidancePanel({
  tone,
  items,
  description,
}: {
  tone: 'amber' | 'rose';
  items: { label: string; value: string }[];
  description: string;
}) {
  const toneClass = tone === 'amber'
    ? {
        panel: 'border-amber-200 bg-amber-50 text-amber-950',
        chip: 'border-amber-200 bg-white text-amber-800',
        copy: 'text-amber-800/75',
      }
    : {
        panel: 'border-rose-200 bg-rose-50 text-rose-950',
        chip: 'border-rose-200 bg-white text-rose-800',
        copy: 'text-rose-800/75',
      };

  return (
    <div className={`mb-5 rounded-[1.5rem] border p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.78)] ${toneClass.panel}`}>
      <div className="grid grid-cols-3 gap-2">
        {items.map((item) => (
          <div key={item.label} className={`rounded-2xl border px-3 py-2 ${toneClass.chip}`}>
            <p className="text-[11px] font-semibold opacity-60">{item.label}</p>
            <p className="mt-1 text-xs font-semibold">{item.value}</p>
          </div>
        ))}
      </div>
      <p className={`mt-3 text-xs leading-relaxed ${toneClass.copy}`}>{description}</p>
    </div>
  );
}

function MetaChip({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Clock;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-3">
      <div className="flex items-center gap-1.5 text-white/45">
        <Icon size={13} weight="regular" />
        <span className="text-[11px] font-semibold">{label}</span>
      </div>
      <p className="mt-1 text-xs font-semibold text-white/85">{value}</p>
    </div>
  );
}
