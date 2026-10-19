import { PageHeader } from "@/components/layout/page-header";
import { loadSettings } from "@/features/settings/api";
import { SettingForm } from "@/features/settings/components/setting-form";
import { requireRoutePermission } from "@/lib/rbac/require-permission";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function SettingsPage() {
  const access = await requireRoutePermission("/settings");
  const supabase = await createSupabaseServerClient();
  const result = await loadSettings(supabase, access);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Settings"
        title="Platform settings"
        description="Defaults and policy copy the app reads. Each setting saves on its own; the server checks every value and names the problem when it refuses one."
      />
      {result.ok ? (
        <div className="grid max-w-5xl gap-6 lg:grid-cols-2">
          {result.entries.map((entry) => (
            // Keyed on the stored time so the form restarts from the server's value after a save.
            <SettingForm key={`${entry.definition.key}-${entry.updatedAt ?? "unset"}`} entry={entry} />
          ))}
        </div>
      ) : (
        <p role="alert" className="text-sm text-destructive">
          {result.error}
        </p>
      )}
    </div>
  );
}
