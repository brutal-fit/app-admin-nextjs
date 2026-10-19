import { PageHeader } from "@/components/layout/page-header";
import { loadAnnouncementsPage } from "@/features/announcements/api";
import { AnnouncementComposer } from "@/features/announcements/components/announcement-composer";
import { AnnouncementHistory } from "@/features/announcements/components/announcement-history";
import { ANNOUNCEMENT_HISTORY_LIMIT } from "@/features/announcements/schemas";
import { missingPermissionMessage } from "@/features/users/format";
import { can } from "@/lib/rbac/can";
import { requireRoutePermission } from "@/lib/rbac/require-permission";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function AnnouncementsPage() {
  const access = await requireRoutePermission("/announcements");
  const supabase = await createSupabaseServerClient();
  const result = await loadAnnouncementsPage(supabase, access);

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow="Announcements"
        title="Announcements"
        description="An in-app message to everyone, all clients, all trainers or trainers in one city, or one person. It lands in each inbox; there is no push yet."
      />
      <section aria-labelledby="announcement-new" className="flex flex-col gap-4">
        <h2 id="announcement-new" className="text-lg font-semibold">
          New announcement
        </h2>
        <AnnouncementComposer
          cities={result.cities.ok ? result.cities.items : []}
          citiesError={result.cities.ok ? null : result.cities.error}
          canSearchUsers={can(access.permissions, "users.read")}
          searchUsersReason={missingPermissionMessage("users.read", "Sending to one person")}
        />
      </section>
      <section aria-labelledby="announcement-history" className="flex flex-col gap-4">
        <h2 id="announcement-history" className="text-lg font-semibold">
          Sent
        </h2>
        {result.history.ok ? (
          <>
            <AnnouncementHistory
              rows={result.history.rows}
              names={result.names}
              permissions={access.permissions}
            />
            {result.history.rows.length >= ANNOUNCEMENT_HISTORY_LIMIT ? (
              <p className="text-xs text-muted-foreground">
                Showing the newest {ANNOUNCEMENT_HISTORY_LIMIT}; older announcements are not listed.
              </p>
            ) : null}
          </>
        ) : (
          <p role="alert" className="text-sm text-destructive">
            {result.history.error}
          </p>
        )}
      </section>
    </div>
  );
}
