/*
 * The support desk data layer: the only file in src/ that spells the support function names.
 * Every call runs with the admin's own session; the functions check the key themselves
 * (support.read to list and open, support.manage to update, support.assign to assign) and
 * fail through private.fail. Every wrapper throws AppError (via toAppError) on failure.
 */
import { z } from "zod";
import { AppError, toAppError } from "@/lib/supabase/errors";
import type { AppSupabaseClient } from "@/lib/supabase/server";
import type { ReportCategory, SupportCaseListRow, SupportCaseStatus } from "@/types/database";

const RPC = {
  list: "admin_list_support_cases",
  get: "admin_get_support_case",
  update: "admin_update_support_case",
} as const;

const SUPPORT_STATUS_VALUES = [
  "open",
  "triaged",
  "waiting_for_user",
  "investigating",
  "resolved",
  "closed",
  "escalated",
] as const satisfies readonly SupportCaseStatus[];

const REPORT_CATEGORY_VALUES = [
  "person",
  "booking",
  "message",
  "review",
  "safety",
  "other",
] as const satisfies readonly ReportCategory[];

const text = z.string().nullable().optional();

// The detail is jsonb, so its shape is checked before the panel renders it. Optional fields
// read as absent rather than failing the page when the backend leaves one out.
const bookingTargetSchema = z.object({
  kind: z.literal("booking"),
  id: z.string(),
  status: text,
  payment_status: text,
  mode: text,
  service_title: text,
  start_at: text,
  end_at: text,
  price_snapshot_inr: z.number().nullable().optional(),
  client_id: text,
  client_name: text,
  trainer_id: text,
  trainer_name: text,
});

const userTargetSchema = z.object({
  kind: z.literal("user"),
  id: z.string(),
  name: text,
  username: text,
  role: text,
  account_status: text,
});

const reviewTargetSchema = z.object({
  kind: z.literal("review"),
  id: z.string(),
  booking_id: text,
  rating: z.number().nullable().optional(),
  body: text,
  hidden: z.boolean().nullable().optional(),
  author_display_name: text,
  client_id: text,
  trainer_id: text,
  created_at: text,
});

const messageTargetSchema = z.object({
  kind: z.literal("message"),
  id: z.string(),
  conversation_id: text,
  sender_id: text,
  sender_name: text,
  body: text,
  created_at: text,
});

const targetDetailSchema = z.discriminatedUnion("kind", [
  bookingTargetSchema,
  userTargetSchema,
  reviewTargetSchema,
  messageTargetSchema,
]);

const eventSchema = z.object({
  id: z.string(),
  kind: z.enum(["note", "reply", "status", "assignment"]),
  body: text,
  old_status: z.enum(SUPPORT_STATUS_VALUES).nullable().optional(),
  new_status: z.enum(SUPPORT_STATUS_VALUES).nullable().optional(),
  assignee_id: text,
  assignee_name: text,
  author_id: text,
  author_name: text,
  created_at: z.string(),
});

const supportCaseDetailSchema = z.object({
  case: z.object({
    id: z.string(),
    reporter_id: z.string(),
    category: z.enum(REPORT_CATEGORY_VALUES),
    subject: z.string(),
    details: z.string().nullable().optional(),
    target_type: text,
    target_id: text,
    target_label: text,
    status: z.enum(SUPPORT_STATUS_VALUES),
    priority: z.enum(["normal", "high", "safety"]),
    assignee_id: text,
    last_update_note: text,
    created_at: z.string(),
    updated_at: z.string(),
  }),
  reporter: z
    .object({
      id: z.string(),
      name: text,
      username: text,
      email: text,
      role: text,
      account_status: text,
    })
    .nullable()
    .optional(),
  assignee: z.object({ id: z.string(), name: text }).nullable().optional(),
  target: z
    .object({
      type: text,
      id: text,
      label: text,
      detail: targetDetailSchema.nullable().optional(),
    })
    .nullable()
    .optional(),
  events: z.array(eventSchema),
});

export type SupportCaseDetail = z.infer<typeof supportCaseDetailSchema>;
export type SupportCaseEvent = SupportCaseDetail["events"][number];
export type SupportTargetDetail = z.infer<typeof targetDetailSchema>;

function parseDetail(data: unknown): SupportCaseDetail {
  const parsed = supportCaseDetailSchema.safeParse(data);
  if (!parsed.success) {
    throw new AppError("UNKNOWN", "The support case came back in a shape the panel does not know.");
  }
  return parsed.data;
}

export type SupportCaseQuery = {
  status: SupportCaseStatus | null;
  category: ReportCategory | null;
  assigneeId: string | null;
  search: string;
  limit: number;
  offset: number;
};

/** One page of the queue: safety first, then open before resolved, then newest change. */
export async function listSupportCases(
  client: AppSupabaseClient,
  query: SupportCaseQuery,
): Promise<SupportCaseListRow[]> {
  const { data, error } = await client.rpc(RPC.list, {
    p_status: query.status,
    p_category: query.category,
    p_assignee: query.assigneeId,
    p_search: query.search === "" ? null : query.search,
    p_limit: query.limit,
    p_offset: query.offset,
  });
  if (error) throw toAppError(error);
  return data;
}

/** The case, its reporter, assignee, linked target and every event in order. */
export async function getSupportCase(
  client: AppSupabaseClient,
  id: string,
): Promise<SupportCaseDetail> {
  const { data, error } = await client.rpc(RPC.get, { p_id: id });
  if (error) throw toAppError(error);
  return parseDetail(data);
}

/**
 * One change to a case. Only the fields given are sent; the function writes an event per
 * change, notifies the reporter on a reply or a waiting/resolved status, and returns the
 * case as admin_get_support_case does.
 */
export type SupportCaseChange =
  | { kind: "status"; status: SupportCaseStatus }
  | { kind: "assign"; assigneeId: string }
  | { kind: "unassign" }
  | { kind: "note"; body: string }
  | { kind: "reply"; body: string };

export async function updateSupportCase(
  client: AppSupabaseClient,
  id: string,
  change: SupportCaseChange,
): Promise<SupportCaseDetail> {
  const { data, error } = await client.rpc(RPC.update, {
    p_id: id,
    p_status: change.kind === "status" ? change.status : null,
    p_assignee: change.kind === "assign" ? change.assigneeId : null,
    p_note: change.kind === "note" ? change.body : null,
    p_reply: change.kind === "reply" ? change.body : null,
    p_unassign: change.kind === "unassign",
  });
  if (error) throw toAppError(error);
  return parseDetail(data);
}
