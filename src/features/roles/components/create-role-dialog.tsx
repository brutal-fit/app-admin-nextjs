"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { RoleForm } from "@/features/roles/components/role-form";

export function CreateRoleDialog() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="primary" onClick={() => setOpen(true)}>
        New role
      </Button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="New role"
        description="Create the role first, then choose its permissions on the role page."
      >
        <RoleForm mode="create" onDone={() => setOpen(false)} />
      </Dialog>
    </>
  );
}
