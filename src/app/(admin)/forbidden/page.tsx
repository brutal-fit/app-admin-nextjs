import Link from "next/link";
import { requireRoutePermission } from "@/lib/rbac/require-permission";

export default async function ForbiddenPage() {
  await requireRoutePermission("/forbidden");
  return (
    <div className="flex max-w-lg flex-col gap-3">
      <h1 className="text-2xl font-semibold">No access</h1>
      <p className="text-sm text-muted-foreground">
        Your roles do not include the permission this page needs. Ask an admin who can manage
        roles to grant it.
      </p>
      <Link
        href="/dashboard"
        className="text-sm font-medium text-foreground underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-ring"
      >
        Back to the dashboard
      </Link>
    </div>
  );
}
