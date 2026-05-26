// Lightweight skeleton building blocks. Pulse animation comes from
// Tailwind's animate-pulse. Heights are explicit so layout doesn't
// jump when real content arrives.

export function SkeletonBox({
  className = "",
  height = 40,
}: {
  className?: string;
  height?: number;
}) {
  return (
    <div
      className={`bg-white/[0.06] rounded-xl animate-pulse ${className}`}
      style={{ height }}
    />
  );
}

export function SkeletonHero() {
  return (
    <div className="glass mt-4 px-6 pt-11 pb-3 animate-fade-up">
      <div className="text-center">
        <div
          className="bg-white/[0.06] rounded-xl animate-pulse mx-auto"
          style={{ height: 88, width: 200 }}
        />
        <div
          className="bg-white/[0.04] rounded-lg animate-pulse mx-auto mt-4"
          style={{ height: 16, width: 100 }}
        />
      </div>
      <div className="text-center mt-10">
        <div
          className="bg-white/[0.06] rounded-xl animate-pulse mx-auto"
          style={{ height: 60, width: 160 }}
        />
        <div
          className="bg-white/[0.04] rounded-lg animate-pulse mx-auto mt-3"
          style={{ height: 14, width: 110 }}
        />
      </div>
      <div className="mt-9 border-t border-line pt-4 space-y-3">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="flex items-center justify-between gap-3 py-2"
          >
            <div className="flex items-center gap-3 flex-1">
              <div className="w-2 h-2 rounded-full bg-white/[0.08]" />
              <div className="bg-white/[0.06] rounded animate-pulse h-4 w-32" />
            </div>
            <div className="bg-white/[0.06] rounded animate-pulse h-5 w-10" />
          </div>
        ))}
      </div>
    </div>
  );
}
