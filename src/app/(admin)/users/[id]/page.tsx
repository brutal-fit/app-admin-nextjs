import { Avatar } from "@/components/avatar/avatar";
import { PageHeader } from "@/components/layout/page-header";
import { StatusPulse } from "@/components/motion/status-pulse";
import { Can } from "@/components/rbac/can";
import { Badge } from "@/components/ui/badge";
import { AccountStatusControl } from "@/features/users/components/account-status-control";
import { GrantTrainerAccess } from "@/features/users/components/grant-trainer-access";
import { loadEnrolments } from "@/features/programmes/api";
import { CustomPlanList } from "@/features/coaching/components/custom-plan-list";
import { loadCustomPlans } from "@/features/coaching/api";
import { UserAuditList } from "@/features/users/components/user-audit-list";
import { UserEnrolments } from "@/features/users/components/user-enrolments";
import { UserOverview } from "@/features/users/components/user-overview";
import { UserPrivacyRequests } from "@/features/users/components/user-privacy-requests";
import { UserRolesPanel, type AssignedRole } from "@/features/users/components/user-roles-panel";
import { formatDateTime } from "@/features/applications/format";
import {
  ACCOUNT_STATUS_LABELS,
  PLATFORM_ROLE_LABELS,
  accountStatusTone,
  describePhone,
  missingPermissionMessage,
  suspendBlockedReason,
} from "@/features/users/format";
import { listRoles, listUserRoleGrants } from "@/lib/db/rbac";
import { getUserDetail } from "@/lib/db/users";
import { can } from "@/lib/rbac/can";
import { requireRoutePermission } from "@/lib/rbac/require-permission";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { toAvatarRef } from "@/lib/utils/avatar";
import { toAppError } from "@/lib/supabase/errors";

async function loadUser(userId: string) {
  try {
    const supabase = await createSupabaseServerClient();
    const [detail, grants, roles] = await Promise.all([
      getUserDetail(supabase, userId),
      listUserRoleGrants(supabase, userId),
      listRoles(supabase),
    ]);
    const rolesById = new Map(roles.map((role) => [role.id, role]));
    const assigned: AssignedRole[] = grants.map((grant) => {
      const role = rolesById.get(grant.roleId);
      return {
        roleId: grant.roleId,
        key: role?.key ?? "unknown",
        name: role?.name ?? "Unknown role",
        isSystem: role?.is_system ?? false,
        grantedAt: grant.grantedAt,
      };
    });
    const available = roles.map((role) => ({ id: role.id, name: role.name, key: role.key }));
    return { ok: true as const, detail, assigned, available };
  } catch (error) {
    return { ok: false as const, error: toAppError(error).message };
  }
}

// Settles on its own: a failed read shows in its section, not over the whole page.
async function loadUserEnrolments(userId: string): ReturnType<typeof loadEnrolments> {
  try {
    const supabase = await createSupabaseServerClient();
    return await loadEnrolments(supabase, userId);
  } catch (error) {
    return { ok: false, error: toAppError(error).message };
  }
}

// Settles on its own like the enrolments; needs catalogue.manage.
async function loadUserCustomPlans(
  access: Parameters<typeof loadCustomPlans>[1],
  userId: string,
): ReturnType<typeof loadCustomPlans> {
  try {
    const supabase = await createSupabaseServerClient();
    return await loadCustomPlans(supabase, access, { clientId: userId });
  } catch (error) {
    return { kind: "error", reason: toAppError(error).message };
  }
}

const BACK = { href: "/users", label: "Back to users" };

export default async function UserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const access = await requireRoutePermission("/users/[id]");
  const { id } = await params;
  const [result, enrolments, customPlans] = await Promise.all([
    loadUser(id),
    loadUserEnrolments(id),
    loadUserCustomPlans(access, id),
  ]);

  if (!result.ok) {
    return (
      <div className="flex flex-col gap-3">
        <PageHeader title="User" back={BACK} />
        <p role="alert" className="text-sm text-destructive">
          {result.error}
        </p>
      </div>
    );
  }

  const { detail, assigned, available } = result;
  const name = detail.full_name?.trim() || detail.username || "Unnamed";
  const canSuspend = can(access.permissions, "users.suspend");

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow="User"
        title={name}
        back={BACK}
        status={
          <StatusPulse value={detail.account_status} className={accountStatusTone(detail.account_status)}>
            <Badge variant="outline" className={accountStatusTone(detail.account_status)}>
              {ACCOUNT_STATUS_LABELS[detail.account_status]}
            </Badge>
          </StatusPulse>
        }
      >
        <div className="flex max-w-xl items-start gap-4 rounded-xl border bg-card p-4 shadow-tile">
          <Avatar name={name} avatar={toAvatarRef(detail.avatar_path, detail.avatar_preset)} size="lg" />
          <dl className="grid min-w-0 flex-1 grid-cols-[auto_1fr] gap-x-6 gap-y-1 text-sm">
          <dt className="text-muted-foreground">Phone</dt>
          <dd className="tabular-nums">{detail.phone ? describePhone(detail.phone).text : "No phone"}</dd>
          <dt className="text-muted-foreground">Email</dt>
          <dd>{detail.email ?? "No email"}</dd>
          <dt className="text-muted-foreground">Username</dt>
          <dd>{detail.username ? `@${detail.username}` : "None"}</dd>
          <dt className="text-muted-foreground">App role</dt>
          <dd>{detail.platform_role ? PLATFORM_ROLE_LABELS[detail.platform_role] : "None"}</dd>
          <dt className="text-muted-foreground">Joined</dt>
          <dd>
            <time dateTime={detail.created_at}>{formatDateTime(detail.created_at)}</time>
          </dd>
          </dl>
        </div>
      </PageHeader>

      <section aria-labelledby="user-account" className="flex max-w-3xl flex-col gap-3">
        <h2 id="user-account" className="text-lg font-semibold">
          Account
        </h2>
        <div className="flex flex-wrap items-start gap-6">
          {canSuspend ? (
            <AccountStatusControl
              // Keyed on the stored status so the control starts fresh after each change.
              key={detail.account_status}
              userId={detail.id}
              userName={name}
              status={detail.account_status}
              blockedReason={suspendBlockedReason({
                targetId: detail.id,
                sessionUserId: access.userId,
                targetRoleKeys: detail.roles,
              })}
            />
          ) : (
            <p className="text-sm text-muted-foreground">
              {missingPermissionMessage("users.suspend", "Suspending or reinstating")}
            </p>
          )}
        </div>
      </section>

      <UserOverview detail={detail} permissions={access.permissions} />

      <UserEnrolments
        userId={detail.id}
        rows={enrolments.ok ? enrolments.rows : []}
        error={enrolments.ok ? null : enrolments.error}
        permissions={access.permissions}
      />

      <section aria-labelledby="user-custom-plans" className="flex max-w-4xl flex-col gap-3">
        <h2 id="user-custom-plans" className="text-lg font-semibold">
          Custom plans
        </h2>
        <CustomPlanList state={customPlans} side="client" permissions={access.permissions} />
      </section>

      <section aria-labelledby="user-roles" className="flex max-w-2xl flex-col gap-4">
        <h2 id="user-roles" className="text-lg font-semibold">
          Admin roles
        </h2>
        <Can
          permission="users.manage"
          fallback={
            <p className="text-sm text-muted-foreground">
              {assigned.length === 0
                ? "No admin roles."
                : assigned.map((role) => role.name).join(", ")}
            </p>
          }
        >
          <UserRolesPanel userId={detail.id} assigned={assigned} available={available} />
        </Can>
      </section>

      <Can permission="users.manage">
        <section aria-labelledby="user-app-access" className="flex max-w-2xl flex-col gap-4">
          <h2 id="user-app-access" className="text-lg font-semibold">
            App access
          </h2>
          <GrantTrainerAccess userId={detail.id} platformRole={detail.platform_role ?? null} />
        </section>
      </Can>

      <UserPrivacyRequests
        requests={detail.privacy_requests}
        canProcess={can(access.permissions, "privacy.process")}
      />

      <UserAuditList userId={detail.id} entries={detail.recent_audit} permissions={access.permissions} />
    </div>
  );
}
