import { Suspense } from "react";
import { AdminShell } from "@/components/layout/admin-shell";

function ShellFallback() {
  return (
    <div className="flex min-h-dvh items-center justify-center">
      <p className="text-sm text-text-muted">Loading...</p>
    </div>
  );
}

// The shell reads the session (request data), so it streams behind this boundary.
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<ShellFallback />}>
      <AdminShell>{children}</AdminShell>
    </Suspense>
  );
}
