/**
 * Which single next action the Dashboard should suggest.
 *
 * The Dashboard previously rendered two independent recommendation cards — one from the
 * legacy history table, one from local session drafts — which could point in different
 * directions at the same time. This resolves both signals into one ranked decision.
 */
export type DashboardRecommendationKind =
  | 'resume-session'
  | 'clear-wrong-book'
  | 'review-session'
  | 'first-session'
  | 'keep-going';

export type DashboardRecommendationInput = {
  /** Sessions with a saved but unfinished draft. */
  sessionsInProgress: number;
  /** Sessions answered but not yet checked. */
  sessionsNeedingReview: number;
  /** Wrong-book entries across both question models. */
  wrongBookCount: number;
  /** Legacy single-question attempts. */
  legacyAttempts: number;
  /** Locally recorded practice-session attempts. */
  sessionAttempts: number;
};

export type DashboardRecommendation = {
  kind: DashboardRecommendationKind;
  title: string;
  description: string;
  actionLabel: string;
};

/**
 * Rank by what is most concretely unfinished: an open draft beats a review queue, which
 * beats starting something new. Pure.
 */
export function resolveDashboardRecommendation(
  input: DashboardRecommendationInput
): DashboardRecommendation {
  if (input.sessionsInProgress > 0) {
    return {
      kind: 'resume-session',
      title: '先把没做完的 Session 收尾',
      description:
        input.sessionsInProgress === 1
          ? '有 1 组练习还停在中途。趁记忆还在，把它做完比开新的一组更划算。'
          : `有 ${input.sessionsInProgress} 组练习还停在中途。先收尾再开新的。`,
      actionLabel: '继续未完成的练习',
    };
  }

  if (input.sessionsNeedingReview > 0) {
    return {
      kind: 'review-session',
      title: '有练习做完了还没看结果',
      description: `${input.sessionsNeedingReview} 组已作答但还没进入复盘。看一遍逐题回顾，收益比再刷一组更高。`,
      actionLabel: '查看复盘',
    };
  }

  if (input.wrongBookCount > 0) {
    return {
      kind: 'clear-wrong-book',
      title: '先把错题队列清一遍',
      description: `还有 ${input.wrongBookCount} 道题值得复盘。先减少不确定性，再进入新题练习。`,
      actionLabel: '复习错题',
    };
  }

  if (input.legacyAttempts === 0 && input.sessionAttempts === 0) {
    return {
      kind: 'first-session',
      title: '从一组完整 Session 开始',
      description: '完整的 Reading / Listening Session 比单题更接近真实考试节奏，也会开始记录你的正确率。',
      actionLabel: '开始第一组练习',
    };
  }

  return {
    kind: 'keep-going',
    title: '继续做一组进阶练习',
    description: '基础闭环已经跑通。保持低摩擦、高频率，比一次性刷很多题更稳定。',
    actionLabel: '继续训练',
  };
}
