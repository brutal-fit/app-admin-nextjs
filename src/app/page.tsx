import { Suspense } from "react";
import { redirect } from "next/navigation";
import { homeHref } from "@/lib/rbac/permissions";
import { getSessionAccess } from "@/lib/rbac/session";

// The session is request data, so the decision streams behind a boundary.
export default function HomePage() {
  return (
    <Suspense fallback={null}>
      <SessionRedirect />
    </Suspense>
  );
}

async function SessionRedirect(): Promise<never> {
  const session = await getSessionAccess();
  redirect(session.status === "ok" ? homeHref(session.access.permissions) : "/login");
}
