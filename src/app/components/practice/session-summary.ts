import type { PracticeSessionDraftStatus } from '@/lib/practice-session-draft';
import type { PracticeRecommendationReason } from '@/lib/practice-session-recommendations';
import type { PracticeUnit } from '@/lib/types';

export function getSessionFlow(unit: PracticeUnit) {
  if (unit.skill === 'listening') {
    return ['查看音频占位与 Transcript', '完成 5 道关联题', '本地检查并进入 Review Mode'];
  }

  if (unit.skill === 'writing') {
    return ['阅读 Writing Task prompt', '完成本地长文草稿', '进入人工 / AI 反馈占位'];
  }

  if (unit.skill === 'speaking') {
    return ['阅读 Part 2 cue card', '记录回答要点或自评', '进入录音 / 转写占位'];
  }

  return ['阅读完整 Passage', '完成 5 道关联题', '本地检查并进入 Review Mode'];
}

export function getDraftSummary(status: PracticeSessionDraftStatus | undefined) {
  if (!status) {
    return {
      label: '未开始',
      className: 'border-line bg-zinc-50 text-ink-subtle',
      hasDraft: false,
      ctaLabel: '进入 Session',
    };
  }

  const metadata = [
    status.flagged > 0 ? `${status.flagged} 标记` : null,
    status.notes > 0 ? `${status.notes} 笔记` : null,
  ].filter(Boolean);
  const metadataText = metadata.length ? ` · ${metadata.join(' · ')}` : '';

  if (status.showResults) {
    return {
      label: `已检查 · ${status.answered}/${status.total}${metadataText}`,
      className: 'border-emerald-200 bg-emerald-50 text-emerald-700',
      hasDraft: true,
      ctaLabel: status.flagged > 0 || status.notes > 0 ? '继续复盘' : '继续 Session',
    };
  }

  if (status.answered > 0) {
    return {
      label: `草稿 · ${status.answered}/${status.total}${metadataText}`,
      className: 'border-amber-200 bg-amber-50 text-amber-700',
      hasDraft: true,
      ctaLabel: status.flagged > 0 || status.notes > 0 ? '继续复盘' : '继续 Session',
    };
  }

  if (status.flagged > 0 || status.notes > 0) {
    return {
      label: `待复盘${metadataText}`,
      className: 'border-sky-200 bg-sky-50 text-sky-700',
      hasDraft: true,
      ctaLabel: '继续复盘',
    };
  }

  return {
    label: '未开始',
    className: 'border-line bg-zinc-50 text-ink-subtle',
    hasDraft: false,
    ctaLabel: '进入 Session',
  };
}

export function recommendationCopy(reason: PracticeRecommendationReason) {
  const copy: Record<PracticeRecommendationReason, { label: string; detail: string; badge: string }> = {
    review: {
      label: '优先复盘',
      detail: '这组已经检查过，而且还有标记或笔记。先把复盘闭环完成。',
      badge: 'border-sky-200 bg-sky-50 text-sky-700',
    },
    continue: {
      label: '继续草稿',
      detail: '这组已经开始但还没检查。继续完成比开启新任务更有价值。',
      badge: 'border-amber-200 bg-amber-50 text-amber-700',
    },
    start: {
      label: '开始训练',
      detail: '适合作为下一组本地 Session，完成后进入本地 Review Report。',
      badge: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    },
    stretch: {
      label: '挑战模式',
      detail: '当前基础闭环已具备，可以用 Challenge 类任务提高压力。',
      badge: 'border-violet-200 bg-violet-50 text-violet-700',
    },
  };

  return copy[reason];
}
