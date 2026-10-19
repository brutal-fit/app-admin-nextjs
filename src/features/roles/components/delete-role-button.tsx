"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { deleteRoleAction } from "@/features/roles/actions";
import { showToast } from "@/stores/toast-store";

export function DeleteRoleButton({
  roleId,
  roleName,
  disabledReason,
}: {
  roleId: string;
  roleName: string;
  disabledReason?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function confirmDelete() {
    startTransition(async () => {
      const result = await deleteRoleAction({ id: roleId });
      if (!result.ok) {
        showToast("error", result.error.message);
        return;
      }
      setOpen(false);
      showToast("success", `Role ${roleName} deleted.`);
      router.push("/roles");
    });
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <Button variant="danger" disabled={Boolean(disabledReason)} onClick={() => setOpen(true)}>
        Delete role
      </Button>
      {disabledReason ? <p className="text-sm text-text-muted">{disabledReason}</p> : null}
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title={`Delete ${roleName}?`}
        description="Everyone holding this role loses its permissions. This cannot be undone."
      >
        <div className="flex justify-end gap-3">
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
            Cancel
          </Button>
          <Button variant="danger" onClick={confirmDelete} disabled={pending}>
            {pending ? "Deleting..." : "Delete role"}
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
