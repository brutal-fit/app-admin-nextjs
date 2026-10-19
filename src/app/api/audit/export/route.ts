import { NextResponse } from "next/server";
import { auditCsvHeader, auditCsvRow } from "@/features/audit/format";
import {
  AUDIT_EXPORT_MAX,
  auditExportFileName,
  invalidAuditRange,
  parseAuditFilters,
} from "@/features/audit/schemas";
import { AUDIT_CALL_MAX, listAuditLog, type AuditListPage, type AuditQuery } from "@/lib/db/audit";
import { ForbiddenError, requirePermission } from "@/lib/rbac/require-permission";
import { AppError, errorPayload, toAppError, type AppErrorPayload } from "@/lib/supabase/errors";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { currentTime, istDateString, istDatesToRange } from "@/lib/utils/time";

function fail(status: number, error: AppErrorPayload) {
  return NextResponse.json({ ok: false, error }, { status });
}

function statusFor(error: AppError): number {
  if (error.code === "BRPRM") return 403;
  if (error.code === "BRVAL") return 400;
  if (error.code === "BRNTF") return 404;
  return 500;
}

/**
 * Streams the filtered audit log as CSV, newest first, up to AUDIT_EXPORT_MAX rows in calls
 * of AUDIT_CALL_MAX. Needs audit.read and audit.export here, and admin_list_audit checks both
 * again. The first call runs before the response starts, so a refusal comes back as a status
 * code; a failure after that aborts the download instead of ending it short. Rows are never
 * logged.
 */
export async function GET(request: Request) {
  try {
    await requirePermission("audit.read");
    await requirePermission("audit.export");
  } catch (error) {
    if (error instanceof ForbiddenError) return fail(403, new AppError("BRPRM").toPayload());
    return fail(500, errorPayload(error));
  }

  const params = Object.fromEntries(new URL(request.url).searchParams);
  const filters = parseAuditFilters(params);
  if (invalidAuditRange(filters)) {
    return fail(400, new AppError("BRVAL", "The end date is before the start date.").toPayload());
  }

  const now = currentTime();
  const range = istDatesToRange(filters.from, filters.to);
  // Pin the end at the moment the export starts, so entries written while it streams cannot
  // shift the offsets and repeat a row across calls.
  const startedAt = new Date(now).toISOString();
  const to = range.to && range.to < startedAt ? range.to : startedAt;

  const supabase = await createSupabaseServerClient();
  const query = (offset: number, limit: number): AuditQuery => ({
    actorId: filters.actorId,
    action: filters.action,
    targetId: filters.targetId,
    from: range.from,
    to,
    search: filters.search || null,
    limit,
    offset,
  });

  let first: AuditListPage;
  try {
    first = await listAuditLog(supabase, query(0, Math.min(AUDIT_CALL_MAX, AUDIT_EXPORT_MAX)));
  } catch (error) {
    const appError = toAppError(error);
    return fail(statusFor(appError), appError.toPayload());
  }

  const total = Math.min(first.total, AUDIT_EXPORT_MAX);
  const encoder = new TextEncoder();
  let sent = 0;
  let pending: AuditListPage | null = first;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(encoder.encode(auditCsvHeader()));
    },
    // One call per pull, so a slow download holds the next query back.
    async pull(controller) {
      try {
        const page = pending ?? (await listAuditLog(supabase, query(sent, Math.min(AUDIT_CALL_MAX, total - sent))));
        pending = null;
        const rows = page.rows.slice(0, total - sent);
        if (rows.length > 0) {
          controller.enqueue(encoder.encode(rows.map(auditCsvRow).join("")));
          sent += rows.length;
        }
        if (rows.length === 0 || sent >= total) controller.close();
      } catch (error) {
        controller.error(toAppError(error));
      }
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${auditExportFileName(filters, istDateString(now))}"`,
      "Cache-Control": "no-store",
      "X-Total-Count": String(first.total),
    },
  });
}
