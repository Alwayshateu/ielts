export function GuidancePanel({
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
