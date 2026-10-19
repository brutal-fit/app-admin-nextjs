"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Trash2 } from "@/components/icons";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="destructive" disabled={Boolean(disabledReason)}>
            <Trash2 size={16} aria-hidden="true" />
            Delete role
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{`Delete ${roleName}?`}</DialogTitle>
            <DialogDescription>
              Everyone holding this role loses its permissions. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={pending}>
              {pending ? "Deleting..." : "Delete role"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {disabledReason ? <p className="text-sm text-muted-foreground">{disabledReason}</p> : null}
    </div>
  );
}
