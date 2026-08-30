/**
 * Root loading fallback. Shows while any server segment suspends (auth check +
 * Supabase fetch on the force-dynamic pages), so navigation never lands on a
 * blank frame. Kept deliberately light — it renders on every route transition.
 */
export default function Loading() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-canvas">
      <div className="flex flex-col items-center gap-4" role="status" aria-live="polite">
        <span
          className="h-8 w-8 animate-spin rounded-full border-2 border-line border-t-accent"
          aria-hidden="true"
        />
        <p className="text-sm font-medium text-ink-subtle">加载中…</p>
      </div>
    </div>
  );
}
