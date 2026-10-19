import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { requireRoutePermission } from "@/lib/rbac/require-permission";

export default async function ForbiddenPage() {
  await requireRoutePermission("/forbidden");
  return (
    <div className="flex max-w-lg flex-col gap-3">
      <PageHeader
        title="No access"
        description="Your roles do not include the permission this page needs. Ask an admin who can manage roles to grant it."
      />
      <Link
        href="/dashboard"
        className="focus-ring w-fit rounded-sm text-sm font-medium text-foreground underline underline-offset-4"
      >
        Back to the dashboard
      </Link>
    </div>
  );
}
