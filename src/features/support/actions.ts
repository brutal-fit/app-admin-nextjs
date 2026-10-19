"use server";

import { refresh } from "next/cache";
import { updateSupportCase } from "@/lib/db/support";
import { can } from "@/lib/rbac/can";
import { ForbiddenError } from "@/lib/rbac/require-permission";
import { runAction } from "@/server/run-action";
import {
  assignSupportCaseSchema,
  changeSupportStatusSchema,
  supportNoteSchema,
  supportReplySchema,
} from "@/features/support/schemas";
import type { ActionResult } from "@/types/action-result";

// Each action makes one change through admin_update_support_case, then refresh() re-renders
// the case page so it reads the case again from the server. Nothing is updated locally.

export async function changeSupportStatusAction(input: unknown): Promise<ActionResult> {
  return runAction(changeSupportStatusSchema, input, "support.manage", async (data, { supabase }) => {
    await updateSupportCase(supabase, data.caseId, { kind: "status", status: data.status });
    refresh();
    return undefined;
  });
}

export async function assignSupportCaseAction(input: unknown): Promise<ActionResult> {
  return runAction(
    assignSupportCaseSchema,
    input,
    "support.assign",
    async (data, { supabase, access }) => {
      // The function needs support.manage as well as support.assign.
      if (!can(access.permissions, "support.manage")) throw new ForbiddenError("support.manage");
      await updateSupportCase(
        supabase,
        data.caseId,
        data.assigneeId === null
          ? { kind: "unassign" }
          : { kind: "assign", assigneeId: data.assigneeId },
      );
      refresh();
      return undefined;
    },
  );
}

export async function addSupportNoteAction(input: unknown): Promise<ActionResult> {
  return runAction(supportNoteSchema, input, "support.manage", async (data, { supabase }) => {
    await updateSupportCase(supabase, data.caseId, { kind: "note", body: data.body });
    refresh();
    return undefined;
  });
}

export async function replySupportCaseAction(input: unknown): Promise<ActionResult> {
  return runAction(supportReplySchema, input, "support.manage", async (data, { supabase }) => {
    await updateSupportCase(supabase, data.caseId, { kind: "reply", body: data.body });
    refresh();
    return undefined;
  });
}
