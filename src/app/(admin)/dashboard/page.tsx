import { Suspense } from "react";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { ActivityFeed } from "@/features/dashboard/components/activity-feed";
import { ReviewQueue } from "@/features/dashboard/components/review-queue";
import { SectionSkeleton } from "@/features/dashboard/components/section-skeleton";
import { StatTiles } from "@/features/dashboard/components/stat-tiles";
import { loadActivity, loadDashboardTiles, loadReviewQueue } from "@/features/dashboard/api";
import { isGymOnlySession } from "@/lib/rbac/permissions";
import { requireRoutePermission } from "@/lib/rbac/require-permission";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { currentTime, istHour } from "@/lib/utils/time";
import type { SessionAccess } from "@/types/access";

// Each section streams on its own, so a slow count never holds the rest of the page.
async function TilesSection({ access }: { access: SessionAccess }) {
  const supabase = await createSupabaseServerClient();
  return <StatTiles tiles={await loadDashboardTiles(supabase, access, currentTime())} />;
}

async function QueueSection({ access }: { access: SessionAccess }) {
  const supabase = await createSupabaseServerClient();
  return <ReviewQueue result={await loadReviewQueue(supabase, access, currentTime())} />;
}

async function ActivitySection({ access }: { access: SessionAccess }) {
  const supabase = await createSupabaseServerClient();
  return <ActivityFeed result={await loadActivity(supabase, access, currentTime())} />;
}

function greeting(hour: number): string {
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export default async function DashboardPage() {
  const access = await requireRoutePermission("/dashboard");
  // A gym manager's panel is the gym area; the ops dashboard is not theirs.
  if (isGymOnlySession(access.permissions)) redirect("/my-gym");
  const firstName = access.fullName.trim().split(/\s+/)[0] ?? "";

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow="Needs me now"
        title={firstName ? `${greeting(istHour())}, ${firstName}` : greeting(istHour())}
        description="What is waiting on ops right now. Every number is read live from the database; open a tile for the filtered list."
      />
      <Suspense fallback={<SectionSkeleton variant="tiles" />}>
        <TilesSection access={access} />
      </Suspense>
      <div className="grid gap-6 lg:grid-cols-2">
        <Suspense fallback={<SectionSkeleton variant="panel" />}>
          <QueueSection access={access} />
        </Suspense>
        <Suspense fallback={<SectionSkeleton variant="panel" />}>
          <ActivitySection access={access} />
        </Suspense>
      </div>
    </div>
  );
}
