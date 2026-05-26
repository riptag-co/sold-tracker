import { SkeletonBox } from "@/components/Skeleton";

export default function Loading() {
  return (
    <main className="px-5 sm:px-4 pb-20 max-w-2xl mx-auto">
      <SkeletonBox className="mt-5" height={32} />
      <div className="glass mt-5 p-10 animate-fade-up flex justify-center">
        <div
          className="rounded-full bg-white/[0.06] animate-pulse"
          style={{ width: 220, height: 220 }}
        />
      </div>
      <div className="glass mt-3 p-6 animate-fade-up">
        <SkeletonBox height={130} />
      </div>
    </main>
  );
}
