import { Timer } from '@phosphor-icons/react';
import { formatTimer } from './format';

export function SpeakingTimerShell({
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
    <div className="mb-5 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-950">
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
    <div className={`rounded-2xl border px-3 py-2 ${active ? 'border-rose-300 bg-white text-rose-900 shadow-sm' : 'border-rose-200 bg-white text-rose-800/70'}`}>
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
        ? 'rounded-2xl bg-rose-700 px-3 py-2 text-xs font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-rose-800 active:scale-[0.98]'
        : 'rounded-2xl border border-rose-200 bg-white px-3 py-2 text-xs font-semibold text-rose-800 transition-all duration-200 hover:-translate-y-0.5 hover:bg-rose-100 active:scale-[0.98]'}
    >
      {label}
    </button>
  );
}
