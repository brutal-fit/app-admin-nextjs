import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { countRoles, countUsers } from "@/lib/db/rbac";
import { can } from "@/lib/rbac/can";
import { requireRoutePermission } from "@/lib/rbac/require-permission";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { toAppError } from "@/lib/supabase/errors";

type CountResult = { kind: "count"; value: number } | { kind: "error"; message: string } | { kind: "hidden" };

async function settle(load: () => Promise<number>): Promise<CountResult> {
  try {
    return { kind: "count", value: await load() };
  } catch (error) {
    return { kind: "error", message: toAppError(error).message };
  }
}

function StatCard({ label, result, href }: { label: string; result: CountResult; href?: string }) {
  return (
    <Card className="gap-3 py-5">
      <CardHeader className="px-5">
        <CardTitle className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2 px-5">
        {result.kind === "count" ? (
          <p className="text-3xl font-bold">{result.value}</p>
        ) : result.kind === "error" ? (
          <p className="text-sm text-destructive">{result.message}</p>
        ) : (
          <p className="text-sm text-muted-foreground">Your roles do not include this.</p>
        )}
        {href && result.kind === "count" ? (
          <Link
            href={href}
            className="w-fit text-sm underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            Open
          </Link>
        ) : null}
      </CardContent>
    </Card>
  );
}

export default async function DashboardPage() {
  const access = await requireRoutePermission("/dashboard");
  const supabase = await createSupabaseServerClient();
  const [users, roles] = await Promise.all([
    can(access.permissions, "users.read")
      ? settle(() => countUsers(supabase))
      : Promise.resolve<CountResult>({ kind: "hidden" }),
    settle(() => countRoles(supabase)),
  ]);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Signed in as {access.fullName || "an admin"} with {access.permissions.length}{" "}
          {access.permissions.length === 1 ? "permission" : "permissions"}.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard label="Users" result={users} href="/users" />
        <StatCard
          label="Roles"
          result={roles}
          href={can(access.permissions, "rbac.manage") ? "/roles" : undefined}
        />
      </div>
    </div>
  );
}
