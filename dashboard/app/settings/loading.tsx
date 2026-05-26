import { SkeletonBox } from "@/components/Skeleton";

export default function Loading() {
  return (
    <main className="px-5 sm:px-4 pb-20 max-w-2xl mx-auto space-y-3">
      <SkeletonBox className="mt-5" height={32} />
      <div className="glass p-6 animate-fade-up">
        <SkeletonBox height={140} />
      </div>
      <div className="glass p-6 animate-fade-up">
        <SkeletonBox height={80} />
      </div>
    </main>
  );
}
