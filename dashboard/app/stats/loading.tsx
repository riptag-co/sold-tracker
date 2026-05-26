import { SkeletonBox } from "@/components/Skeleton";

export default function Loading() {
  return (
    <main className="px-4 pb-20 max-w-2xl mx-auto">
      <SkeletonBox className="mt-5" height={32} />
      <div className="flex gap-2 mt-5">
        <SkeletonBox className="!rounded-full" height={36} />
        <SkeletonBox className="!rounded-full" height={36} />
      </div>
      <div className="glass mt-4 p-9 animate-fade-up">
        <SkeletonBox height={80} />
        <SkeletonBox className="mt-6" height={48} />
      </div>
      <div className="glass mt-3 p-6 animate-fade-up">
        <SkeletonBox height={180} />
      </div>
    </main>
  );
}
