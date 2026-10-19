import { Skeleton } from "@/components/ui/skeleton";

/** Placeholder while a dashboard section streams in. */
export function SectionSkeleton({ variant }: { variant: "tiles" | "panel" }) {
  if (variant === "tiles") {
    return (
      <div role="status" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <span className="sr-only">Loading counts...</span>
        {Array.from({ length: 6 }, (_, index) => (
          <div key={index} className="flex flex-col gap-3 rounded-xl border bg-card p-5">
            <Skeleton className="h-3 w-40" />
            <Skeleton className="h-9 w-16" />
            <Skeleton className="h-3 w-56 max-w-full" />
          </div>
        ))}
      </div>
    );
  }
  return (
    <div role="status" className="flex flex-col gap-4 rounded-xl border bg-card p-5">
      <span className="sr-only">Loading...</span>
      <Skeleton className="h-5 w-32" />
      {Array.from({ length: 4 }, (_, index) => (
        <Skeleton key={index} className="h-10 w-full" />
      ))}
    </div>
  );
}
