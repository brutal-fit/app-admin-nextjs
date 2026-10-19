"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { signInAction, type SignInState } from "@/features/auth/actions";

export function LoginForm({ notice }: { notice: string | null }) {
  const [state, formAction, pending] = useActionState<SignInState, FormData>(signInAction, null);
  const error = state && !state.ok ? state.error.message : null;
  const message = error ?? notice;

  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      <Input
        id="email"
        name="email"
        type="email"
        label="Email"
        autoComplete="email"
        required
        disabled={pending}
      />
      <Input
        id="password"
        name="password"
        type="password"
        label="Password"
        autoComplete="current-password"
        required
        disabled={pending}
      />
      {message ? (
        <p role="alert" className="rounded-md border border-danger px-3 py-2 text-sm text-danger">
          {message}
        </p>
      ) : null}
      <Button type="submit" variant="primary" disabled={pending}>
        {pending ? "Signing in..." : "Sign in"}
      </Button>
    </form>
  );
}
