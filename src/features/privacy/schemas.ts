import type { PrivacyStatusFilter } from "@/lib/db/users";
import type { PrivacyRequestKind } from "@/types/database";

/** Rows per page; the function reports the total, so no extra row is asked for. */
export const PRIVACY_PAGE_SIZE = 50;

export const PRIVACY_STATUS_FILTERS = ["pending", "completed", "rejected"] as const satisfies readonly PrivacyStatusFilter[];

export const PRIVACY_STATUS_FILTER_LABELS: Record<PrivacyStatusFilter, string> = {
  pending: "Pending",
  completed: "Completed",
  rejected: "Rejected",
};

export const PRIVACY_KINDS = ["data_export", "account_deletion"] as const satisfies readonly PrivacyRequestKind[];

/** List filters as they live in the URL; anything unknown is dropped, not an error. */
export type PrivacyFilters = {
  /** null: every request, pending first. */
  status: PrivacyStatusFilter | null;
  kind: PrivacyRequestKind | null;
  page: number;
};

export const EMPTY_PRIVACY_FILTERS: PrivacyFilters = { status: null, kind: null, page: 1 };

type SearchParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function oneOf<T extends string>(values: readonly T[], raw: string | undefined): T | null {
  return raw !== undefined && (values as readonly string[]).includes(raw) ? (raw as T) : null;
}

export function parsePrivacyFilters(params: SearchParams): PrivacyFilters {
  const page = Number(first(params.page));
  return {
    status: oneOf(PRIVACY_STATUS_FILTERS, first(params.status)),
    kind: oneOf(PRIVACY_KINDS, first(params.kind)),
    page: Number.isInteger(page) && page > 1 ? page : 1,
  };
}

export function privacyListHref(current: PrivacyFilters, change: Partial<PrivacyFilters> = {}): string {
  const next: PrivacyFilters = { ...current, page: 1, ...change };
  const params = new URLSearchParams();
  if (next.status) params.set("status", next.status);
  if (next.kind) params.set("kind", next.kind);
  if (next.page > 1) params.set("page", String(next.page));
  const query = params.toString();
  return query ? `/privacy?${query}` : "/privacy";
}

export function hasPrivacyFilters(filters: PrivacyFilters): boolean {
  return Boolean(filters.status || filters.kind);
}
