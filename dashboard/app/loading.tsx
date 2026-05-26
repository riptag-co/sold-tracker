import { SkeletonHero } from "@/components/Skeleton";

export default function Loading() {
  return (
    <main className="px-4 pb-20 max-w-2xl mx-auto">
      <SkeletonHero />
    </main>
  );
}
