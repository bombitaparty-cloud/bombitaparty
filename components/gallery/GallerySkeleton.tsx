/** Placeholder rows while gallery data streams in (same justified layout → no layout jump). */
const RATIOS = [1.5, 0.67, 1.5, 1, 0.67, 1.5, 0.67, 1.33, 1.5, 0.67, 1, 1.5];

export function GallerySkeleton({ rows = 2, heading = true }: { rows?: number; heading?: boolean }) {
  return (
    <div aria-hidden className="animate-pulse">
      {heading && <div className="mb-5 h-7 w-64 bg-white/[0.06]" />}
      {Array.from({ length: rows }, (_, r) => (
        <div key={r} className="mb-1.5 flex flex-wrap gap-1.5">
          {RATIOS.slice(0, 6).map((ratio, i) => (
            <div
              key={i}
              className="bg-white/[0.05]"
              style={{ flexGrow: ratio, flexBasis: `${ratio * 180}px`, aspectRatio: `${ratio}` }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
