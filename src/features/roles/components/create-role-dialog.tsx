"use client";

import { useState } from "react";
import { Plus } from "@/components/icons";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { RoleForm } from "@/features/roles/components/role-form";

/** `defaultOpen` comes from `?new=role` (the command palette's "New role"). */
export function CreateRoleDialog({ defaultOpen = false }: { defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);

  function onOpenChange(next: boolean) {
    setOpen(next);
    // Drop ?new=role so a reload does not reopen the dialog.
    if (!next && defaultOpen) window.history.replaceState(null, "", window.location.pathname);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button>
          <Plus size={16} aria-hidden="true" />
          New role
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New role</DialogTitle>
          <DialogDescription>
            Create the role first, then choose its permissions on the role page.
          </DialogDescription>
        </DialogHeader>
        <RoleForm mode="create" onDone={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}
