import { describe, expect, it } from "vitest";
import { AppError, errorPayload, toAppError } from "@/lib/supabase/errors";

describe("toAppError", () => {
  it("maps BRPRM to the permission message, ignoring the server text", () => {
    const error = toAppError({ code: "BRPRM", message: "internal detail" });
    expect(error.code).toBe("BRPRM");
    expect(error.message).toBe("You do not have permission to do that.");
  });

  it("keeps the server wording for BRVAL", () => {
    const error = toAppError({ code: "BRVAL", message: "Role key already taken." });
    expect(error.code).toBe("BRVAL");
    expect(error.message).toBe("Role key already taken.");
  });

  it("keeps the server wording for BRNTF and falls back when it is blank", () => {
    expect(toAppError({ code: "BRNTF", message: "Role not found." }).message).toBe(
      "Role not found.",
    );
    expect(toAppError({ code: "BRNTF", message: "  " }).message).toBe(
      "That record no longer exists.",
    );
  });

  it("maps BRSLT to its default message", () => {
    expect(toAppError({ code: "BRSLT", message: "x" })).toMatchObject({
      code: "BRSLT",
      message: "That slot was just taken.",
    });
  });

  it("maps check violation 23514 to UNKNOWN", () => {
    const error = toAppError({ code: "23514", message: "violates check constraint" });
    expect(error.code).toBe("UNKNOWN");
    expect(error.message).toBe("Something went wrong. Try again.");
  });

  it("maps insufficient privilege 42501 to BRPRM", () => {
    expect(toAppError({ code: "42501", message: "denied" }).code).toBe("BRPRM");
  });

  it("maps missing function or table codes to NOT_INSTALLED", () => {
    for (const code of ["PGRST202", "PGRST205", "42P01", "42883"]) {
      expect(toAppError({ code, message: "x" }).code, code).toBe("NOT_INSTALLED");
    }
  });

  it("maps a TypeError to NETWORK and other values to UNKNOWN", () => {
    expect(toAppError(new TypeError("fetch failed")).code).toBe("NETWORK");
    expect(toAppError("boom").code).toBe("UNKNOWN");
    expect(toAppError(null).code).toBe("UNKNOWN");
  });

  it("returns an AppError unchanged", () => {
    const original = new AppError("CONFIG");
    expect(toAppError(original)).toBe(original);
  });
});

describe("errorPayload", () => {
  it("returns code and message only", () => {
    expect(errorPayload({ code: "BRPRM", message: "x" })).toEqual({
      code: "BRPRM",
      message: "You do not have permission to do that.",
    });
  });
});
