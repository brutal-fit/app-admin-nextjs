import { Suspense } from "react";
import { LoginForm } from "@/features/auth/components/login-form";
import { NO_ADMIN_ROLE_MESSAGE } from "@/lib/supabase/errors";

const NOTICES: Record<string, string> = {
  "no-access": NO_ADMIN_ROLE_MESSAGE,
};

type LoginSearchParams = Promise<{ reason?: string | string[] }>;

export default function LoginPage({ searchParams }: { searchParams: LoginSearchParams }) {
  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-12">
      <div className="flex w-full max-w-sm flex-col gap-8">
        <div className="flex flex-col gap-2">
          <p className="text-2xl font-extrabold tracking-widest text-text">BRUTAL</p>
          <h1 className="text-lg font-semibold text-text">Admin sign in</h1>
          <p className="text-sm text-text-muted">
            For BRUTAL staff. Clients and trainers sign in to the app instead.
          </p>
        </div>
        <div className="rounded-lg border border-border bg-surface p-6">
          {/* The reason comes from the URL, so it streams in; the form shows at once. */}
          <Suspense fallback={<LoginForm notice={null} />}>
            <LoginFormWithNotice searchParams={searchParams} />
          </Suspense>
        </div>
      </div>
    </main>
  );
}

async function LoginFormWithNotice({ searchParams }: { searchParams: LoginSearchParams }) {
  const { reason } = await searchParams;
  const key = Array.isArray(reason) ? reason[0] : reason;
  return <LoginForm notice={key ? (NOTICES[key] ?? null) : null} />;
}
