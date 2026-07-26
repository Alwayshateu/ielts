import { Clock } from '@phosphor-icons/react';

export function MetaChip({
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
