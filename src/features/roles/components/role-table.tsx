"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowRight, Shield } from "@/components/icons";
import { DataTable, type DataTableColumn } from "@/components/data-table/data-table";
import { FilterChips } from "@/components/data-table/filter-chips";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import type { RoleSummary } from "@/lib/db/rbac";

const COLUMNS: DataTableColumn<RoleSummary>[] = [
  {
    id: "name",
    header: "Name",
    sortValue: (role) => role.name,
    cell: (role) => (
      <Link
        href={`/roles/${role.id}`}
        className="focus-ring rounded-sm font-medium underline-offset-4 hover:underline"
      >
        {role.name}
      </Link>
    ),
  },
  {
    id: "key",
    header: "Key",
    sortValue: (role) => role.key,
    cell: (role) => <code className="text-xs text-muted-foreground">{role.key}</code>,
  },
  {
    id: "permissions",
    header: "Permissions",
    sortValue: (role) => role.permissionCount,
    cell: (role) => <span className="tabular-nums">{role.permissionCount}</span>,
  },
  {
    id: "type",
    header: "Type",
    sortValue: (role) => (role.is_system ? 0 : 1),
    cell: (role) =>
      role.is_system ? (
        <Badge variant="outline" className="border-warning text-warning">
          System
        </Badge>
      ) : (
        <Badge variant="outline" className="text-muted-foreground">
          Custom
        </Badge>
      ),
  },
  {
    id: "panel",
    header: "Panel access",
    sortValue: (role) => (role.is_admin ? 0 : 1),
    cell: (role) =>
      role.is_admin ? (
        <Badge variant="outline" className="border-success text-success">
          Admin
        </Badge>
      ) : (
        <Badge variant="outline" className="text-muted-foreground">
          No panel access
        </Badge>
      ),
  },
];

type RoleFilter = "system" | "custom" | "panel";

const FILTER_LABELS: Record<RoleFilter, string> = {
  system: "System roles",
  custom: "Custom roles",
  panel: "Grants panel access",
};

function matches(role: RoleSummary, filter: RoleFilter): boolean {
  if (filter === "system") return role.is_system;
  if (filter === "custom") return !role.is_system;
  return role.is_admin;
}

export function RoleTable({ roles }: { roles: RoleSummary[] }) {
  const [filters, setFilters] = useState<RoleFilter[]>([]);
  const shown = useMemo(
    () => roles.filter((role) => filters.every((filter) => matches(role, filter))),
    [roles, filters],
  );

  if (roles.length === 0) {
    return <EmptyState icon={Shield} title="No roles yet" description="Create the first role." />;
  }

  return (
    <DataTable
      rows={shown}
      columns={COLUMNS}
      rowKey={(role) => role.id}
      caption="Roles"
      countLabel={(count) =>
        filters.length > 0
          ? `${count} of ${roles.length} ${roles.length === 1 ? "role" : "roles"}`
          : `${count} ${count === 1 ? "role" : "roles"}`
      }
      toolbar={
        <FilterChips
          label="Filter roles"
          chips={(Object.keys(FILTER_LABELS) as RoleFilter[]).map((filter) => ({
            id: filter,
            label: FILTER_LABELS[filter],
            active: filters.includes(filter),
            onToggle: () =>
              setFilters((current) =>
                current.includes(filter)
                  ? current.filter((item) => item !== filter)
                  : [...current, filter],
              ),
          }))}
          clear={{ onClear: () => setFilters([]) }}
        />
      }
      empty={
        <EmptyState
          icon={Shield}
          title="No role matches"
          description="No role fits every filter that is on. Clear a filter."
        />
      }
      rowActions={(role) => (
        <Link
          href={`/roles/${role.id}`}
          aria-label={`Edit ${role.name}`}
          tabIndex={-1}
          className="focus-ring inline-flex items-center gap-1 rounded-md px-2 py-1 text-sm font-medium text-foreground hover:bg-accent"
        >
          Edit
          <ArrowRight size={14} aria-hidden="true" />
        </Link>
      )}
    />
  );
}
