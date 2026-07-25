'use client';

import Link from 'next/link';
import {
  ArrowRight,
  BookOpenText,
  ChartLineUp,
  CheckCircle,
  ClockCounterClockwise,
  Headphones,
  PenNib,
  ShieldCheck,
} from '@phosphor-icons/react';
import {
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
  type HTMLMotionProps,
  type MotionValue,
} from 'motion/react';
import { useRef, type ReactNode } from 'react';
import { riseChild, springSnap, staggerParent } from './ui/motion-presets';

const DIRECTION_CONTRACT = `<!--
THESIS: A serious IELTS training room opens before login; it refuses the generic centered SaaS hero and shows the practice loop as the product.
OWN-WORLD: Cool canvas, off-black ink, the product's indigo accent, thin dividers, translucent exam-glass, precise study artifacts rather than decorative cards.
STORY: The visitor understands this is a personal IELTS system, sees the loop of practice-record-review, then chooses to start or inspect the login path.
FIRST VIEWPORT: Left rail and thesis copy sit in the quiet zone; the primary action anchors below the promise; a large right-side session desk visual demonstrates passage, answer sheet, and review state.
FORM: Established-world extension, Persuade mode, asymmetric split with a floating study desk; seed not run because the user explicitly requested immediate implementation inside the current product system.
-->`;

const TRAINING_STEPS = [
  {
    label: '练习',
    title: '选一篇 Passage，进入真实节奏',
    desc: '材料常驻，题目跳转，答案草稿都在同一个 session 里。',
    Icon: BookOpenText,
  },
  {
    label: '记录',
    title: '每次提交都留下可读历史',
    desc: '正确率、最近训练和收藏会变成下一次打开时的决策线索。',
    Icon: ChartLineUp,
  },
  {
    label: '复盘',
    title: '错题不消失，回到队列里',
    desc: '先减少不确定性，再进入新题，训练才不会只是在刷数量。',
    Icon: ClockCounterClockwise,
  },
];

const SKILL_LANES = [
  { name: 'Reading', zh: '阅读', Icon: BookOpenText, tone: 'bg-accent' },
  { name: 'Listening', zh: '听力', Icon: Headphones, tone: 'bg-accent/70' },
  { name: 'Writing', zh: '写作', Icon: PenNib, tone: 'bg-zinc-400' },
];

const ANSWER_ROWS = [
  { q: '14', answer: 'not given', state: 'review' },
  { q: '15', answer: 'coastal survey', state: 'correct' },
  { q: '16', answer: 'adaptive route', state: 'draft' },
  { q: '17', answer: 'training log', state: 'correct' },
];

type MagneticLinkProps = Omit<
  HTMLMotionProps<'a'>,
  'style' | 'onPointerMove' | 'onPointerLeave' | 'onPointerUp'
> & {
  children: ReactNode;
  strength?: number;
};

function useSmoothSpring(value: MotionValue<number>) {
  return useSpring(value, { stiffness: 260, damping: 22, mass: 0.35 });
}

function MagneticLink({ children, strength = 7, className = '', ...props }: MagneticLinkProps) {
  const ref = useRef<HTMLAnchorElement>(null);
  const reduce = useReducedMotion();
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSmoothSpring(x);
  const sy = useSmoothSpring(y);

  const handleMove = (e: React.PointerEvent<HTMLAnchorElement>) => {
    if (reduce || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const dx = e.clientX - (rect.left + rect.width / 2);
    const dy = e.clientY - (rect.top + rect.height / 2);
    x.set((dx / (rect.width / 2)) * strength);
    y.set((dy / (rect.height / 2)) * strength);
  };

  const reset = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <motion.a
      ref={ref}
      onPointerMove={handleMove}
      onPointerLeave={reset}
      onPointerUp={reset}
      style={{ x: sx, y: sy }}
      whileTap={reduce ? undefined : { scale: 0.98 }}
      className={className}
      {...props}
    >
      {children}
    </motion.a>
  );
}

function StudyDesk() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24, rotateX: 3 }}
      animate={{ opacity: 1, y: 0, rotateX: 0 }}
      transition={{ ...springSnap, delay: 0.18 }}
      className="relative mx-auto w-full max-w-[43rem] lg:mr-0"
    >
      <div className="absolute -left-8 top-10 hidden h-64 w-64 rounded-full bg-accent/18 blur-3xl lg:block" aria-hidden="true" />
      <div className="absolute -right-6 bottom-3 h-72 w-72 rounded-full bg-accent-tint/70 blur-3xl" aria-hidden="true" />

      <motion.div
        animate={{ y: [0, -10, 0] }}
        transition={{ duration: 7.5, repeat: Infinity, ease: 'easeInOut' }}
        className="relative overflow-hidden rounded-[2.25rem] bg-zinc-950 p-3 shadow-[0_32px_80px_-44px_rgba(24,24,27,0.82)]"
      >
        <div className="rounded-[1.75rem] bg-canvas p-3 sm:p-4">
          <div className="grid gap-3 lg:grid-cols-[1.05fr_0.95fr]">
            <section className="min-h-[25rem] rounded-[1.35rem] bg-white p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)]">
              <div className="mb-6 flex items-center justify-between gap-3 border-b border-zinc-200 pb-4">
                <div>
                  <p className="text-xs font-semibold tracking-[0.14em] text-accent">PASSAGE 01</p>
                  <h2 className="mt-1 text-xl font-semibold tracking-tight text-zinc-950">城市声音如何改变记忆</h2>
                </div>
                <span className="rounded-full bg-accent-tint px-3 py-1 text-xs font-semibold text-accent">Medium</span>
              </div>

              <div className="space-y-3 text-sm leading-7 text-zinc-600">
                <p>
                  Researchers studying commuter routes found that repeated sound markers can become a private map of attention.
                </p>
                <p>
                  In controlled training, learners improved when the material stayed visible while questions moved beside it.
                </p>
                <p className="rounded-2xl bg-accent-tint/80 p-4 font-medium text-accent-strong">
                  The strongest gains came from reviewing uncertainty immediately after the attempt, not days later.
                </p>
              </div>

              <div className="mt-6 flex items-center gap-2">
                {SKILL_LANES.map(({ name, zh, Icon, tone }, index) => (
                  <motion.div
                    key={name}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ ...springSnap, delay: 0.35 + index * 0.07 }}
                    className="flex items-center gap-2 rounded-full border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs font-semibold text-zinc-700"
                  >
                    <span className={`h-2 w-2 rounded-full ${tone}`} />
                    <Icon size={14} weight="regular" />
                    <span>{zh}</span>
                  </motion.div>
                ))}
              </div>
            </section>

            <section className="relative overflow-hidden rounded-[1.35rem] bg-zinc-950 p-5 text-white">
              <div className="absolute -right-20 -top-24 h-56 w-56 rounded-full bg-accent/24 blur-3xl" aria-hidden="true" />
              <div className="relative">
                <p className="text-xs font-semibold tracking-[0.14em] text-indigo-200">ANSWER SHEET</p>
                <h3 className="mt-2 text-2xl font-semibold tracking-tight">把不确定性留在现场</h3>
                <p className="mt-2 text-sm leading-6 text-zinc-400">
                  提交后立刻知道哪些答案该进入复盘，而不是把错题埋进历史里。
                </p>

                <div className="mt-6 space-y-3">
                  {ANSWER_ROWS.map((row, index) => (
                    <motion.div
                      key={row.q}
                      initial={{ opacity: 0, x: 16 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ ...springSnap, delay: 0.45 + index * 0.08 }}
                      className="grid grid-cols-[2.25rem_1fr_auto] items-center gap-3 rounded-2xl bg-white/[0.07] px-3 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
                    >
                      <span className="text-sm font-semibold text-zinc-500">{row.q}</span>
                      <span className="truncate text-sm font-medium text-zinc-100">{row.answer}</span>
                      <span
                        className={`h-2.5 w-2.5 rounded-full ${
                          row.state === 'correct'
                            ? 'bg-indigo-200'
                            : row.state === 'review'
                              ? 'bg-accent'
                              : 'bg-zinc-500'
                        }`}
                      />
                    </motion.div>
                  ))}
                </div>

                <motion.div
                  animate={{ scale: [1, 1.04, 1], opacity: [0.88, 1, 0.88] }}
                  transition={{ duration: 3.8, repeat: Infinity, ease: 'easeInOut' }}
                  className="mt-6 rounded-3xl bg-accent-tint p-4 text-accent-strong shadow-[0_18px_42px_-28px_rgba(79,70,229,0.45)]"
                >
                  <div className="flex items-start gap-3">
                    <CheckCircle size={22} weight="fill" className="mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm font-semibold">下一步已生成</p>
                      <p className="mt-1 text-xs leading-5 text-accent-strong/75">先复盘第 14 题，再继续一组阅读定位训练。</p>
                    </div>
                  </div>
                </motion.div>
              </div>
            </section>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function WelcomeView() {
  return (
    <main className="min-h-[100dvh] overflow-hidden bg-canvas text-ink">
      <div dangerouslySetInnerHTML={{ __html: DIRECTION_CONTRACT }} />

      <div className="pointer-events-none fixed inset-0" aria-hidden="true">
        <div className="absolute left-[8vw] top-[-12rem] h-[30rem] w-[30rem] rounded-full bg-accent/16 blur-3xl" />
        <div className="absolute bottom-[-16rem] right-[-10rem] h-[34rem] w-[34rem] rounded-full bg-indigo-200/36 blur-3xl" />
      </div>

      <div className="relative mx-auto flex min-h-[100dvh] max-w-7xl flex-col px-4 py-5 sm:px-6 lg:px-8">
        <motion.header
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={springSnap}
          className="flex items-center justify-between gap-4 rounded-full border border-white/60 bg-white/50 px-3 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.75),0_18px_44px_-38px_rgba(24,24,27,0.45)] backdrop-blur-xl"
        >
          <Link href="/" className="flex items-center gap-3 rounded-full pr-3 text-sm font-semibold text-zinc-800 active:scale-[0.98]">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-950 text-sm font-semibold text-white">雅</span>
            IELTS Trainer
          </Link>
          <nav className="hidden items-center gap-1 rounded-full bg-white/45 p-1 text-sm font-medium text-zinc-600 sm:flex">
            <a href="#loop" className="rounded-full px-4 py-2 transition-colors hover:bg-white hover:text-zinc-950">训练闭环</a>
            <a href="#proof" className="rounded-full px-4 py-2 transition-colors hover:bg-white hover:text-zinc-950">系统能力</a>
          </nav>
          <Link
            href="/login"
            className="rounded-full bg-zinc-950 px-4 py-2.5 text-sm font-semibold text-white transition-transform active:scale-[0.98]"
          >
            登录
          </Link>
        </motion.header>

        <section className="grid flex-1 items-center gap-12 py-14 lg:grid-cols-[0.88fr_1.12fr] lg:py-12">
          <motion.div variants={staggerParent(0.07)} initial="hidden" animate="show" className="max-w-2xl lg:pt-8">
            <motion.div variants={riseChild} className="mb-8 inline-flex items-center gap-2 rounded-full border border-accent/15 bg-accent-tint px-3 py-2 text-sm font-semibold text-accent shadow-[inset_0_1px_0_rgba(255,255,255,0.72)]">
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-30" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-accent" />
              </span>
              为一个人的雅思训练室而做
            </motion.div>

            <motion.h1 variants={riseChild} className="text-display max-w-[12ch] text-5xl font-semibold tracking-[-0.032em] text-zinc-950 sm:text-6xl lg:text-7xl">
              不要再把错题，留给明天的自己。
            </motion.h1>

            <motion.p variants={riseChild} className="mt-6 max-w-xl text-base leading-8 text-zinc-600 sm:text-lg">
              IELTS Trainer 把练习、记录和复盘放进同一个闭环。你不用重新整理学习轨迹，只需要每天进入下一组最该做的题。
            </motion.p>

            <motion.div variants={riseChild} className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
              <MagneticLink
                href="/login"
                className="group inline-flex items-center justify-center gap-3 rounded-full bg-zinc-950 px-6 py-4 text-sm font-semibold text-white shadow-[0_22px_52px_-34px_rgba(24,24,27,0.9)] transition-colors hover:bg-zinc-800"
              >
                开始训练
                <ArrowRight size={17} weight="bold" className="transition-transform group-hover:translate-x-0.5" />
              </MagneticLink>
              <Link
                href="/login"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-zinc-300/80 bg-white/55 px-6 py-4 text-sm font-semibold text-zinc-800 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)] backdrop-blur-xl transition-colors hover:bg-white active:scale-[0.98]"
              >
                <ShieldCheck size={17} weight="regular" />
                先用游客身份看看
              </Link>
            </motion.div>

            <motion.div variants={riseChild} className="mt-12 grid max-w-xl grid-cols-3 divide-x divide-zinc-300/70 border-y border-zinc-300/70 py-5">
              <div className="pr-4">
                <p className="text-2xl font-semibold tabular-nums text-zinc-950">4</p>
                <p className="mt-1 text-xs leading-5 text-zinc-500">技能方向</p>
              </div>
              <div className="px-4">
                <p className="text-2xl font-semibold tabular-nums text-zinc-950">1</p>
                <p className="mt-1 text-xs leading-5 text-zinc-500">复盘队列</p>
              </div>
              <div className="pl-4">
                <p className="text-2xl font-semibold tabular-nums text-zinc-950">5m</p>
                <p className="mt-1 text-xs leading-5 text-zinc-500">低摩擦热身</p>
              </div>
            </motion.div>
          </motion.div>

          <StudyDesk />
        </section>

        <section id="loop" className="pb-16 pt-2">
          <div className="grid gap-6 lg:grid-cols-[0.72fr_1.28fr] lg:items-end">
            <div>
              <p className="text-sm font-semibold text-accent">训练闭环</p>
              <h2 className="mt-3 max-w-sm text-3xl font-semibold tracking-tight text-zinc-950">页面不是入口，是今天的决定。</h2>
            </div>
            <div className="grid gap-3 md:grid-cols-3" id="proof">
              {TRAINING_STEPS.map(({ label, title, desc, Icon }, index) => (
                <motion.article
                  key={label}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-80px' }}
                  transition={{ ...springSnap, delay: index * 0.07 }}
                  className="rounded-[1.25rem] bg-white/62 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.78)] backdrop-blur-xl"
                >
                  <div className="mb-7 flex items-center justify-between gap-3">
                    <span className="text-sm font-semibold text-zinc-500">{label}</span>
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-950 text-white">
                      <Icon size={18} weight="regular" />
                    </span>
                  </div>
                  <h3 className="text-lg font-semibold tracking-tight text-zinc-950">{title}</h3>
                  <p className="mt-3 text-sm leading-6 text-zinc-600">{desc}</p>
                </motion.article>
              ))}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
