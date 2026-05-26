import { SkeletonBox } from "@/components/Skeleton";

export default function Loading() {
  return (
    <main className="px-4 pb-20 max-w-2xl mx-auto">
      <SkeletonBox className="mt-5" height={32} />
      <SkeletonBox className="mt-3" height={20} />
      <div className="glass mt-6 p-6 animate-fade-up">
        <SkeletonBox height={100} />
      </div>
      {[0, 1, 2].map((i) => (
        <div key={i} className="glass mt-2 p-5 animate-fade-up">
          <SkeletonBox height={70} />
        </div>
      ))}
    </main>
  );
}
