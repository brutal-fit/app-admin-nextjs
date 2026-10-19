import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/features/auth/actions", () => ({ signInAction: vi.fn() }));

import { LoginForm } from "@/features/auth/components/login-form";

afterEach(cleanup);

describe("LoginForm", () => {
  it("renders labelled email and password fields and a submit button", () => {
    render(<LoginForm notice={null} />);
    expect(screen.getByLabelText("Email")).toBeTruthy();
    expect(screen.getByLabelText("Password")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Sign in" })).toBeTruthy();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("shows the notice as an alert", () => {
    render(<LoginForm notice="This account has no admin role." />);
    expect(screen.getByRole("alert").textContent).toBe("This account has no admin role.");
  });
});
