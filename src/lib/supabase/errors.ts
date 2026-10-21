import { isAuthError } from "@supabase/supabase-js";

/**
 * The backend's SQLSTATE contract (private.fail) plus the client-side failures this panel
 * can hit. Every error shown to staff goes through toAppError so wording lives in one place.
 */
export type AppErrorCode =
  | "BRVAL"
  | "BRPRM"
  | "BRNTF"
  | "BRSLT"
  | "AUTH"
  | "NOT_INSTALLED"
  | "CONFIG"
  | "SERVICE_ROLE_MISSING"
  | "NETWORK"
  | "UNKNOWN";

export type AppErrorPayload = { code: AppErrorCode; message: string };

export const NO_ADMIN_ROLE_MESSAGE = "This account has no admin role.";
export const SERVICE_ROLE_MISSING_MESSAGE = "Service role key not configured";

const DEFAULT_MESSAGES: Record<AppErrorCode, string> = {
  BRVAL: "That input is not valid.",
  BRPRM: "You do not have permission to do that.",
  BRNTF: "That record no longer exists.",
  BRSLT: "That slot was just taken.",
  AUTH: "Sign-in failed. Try again.",
  NOT_INSTALLED:
    "The admin schema is not installed on this database yet (RBAC migration pending).",
  CONFIG: "Supabase is not configured. Set the values from .env.example in .env.local.",
  SERVICE_ROLE_MISSING: SERVICE_ROLE_MISSING_MESSAGE,
  NETWORK: "Could not reach the server. Check the connection and try again.",
  UNKNOWN: "Something went wrong. Try again.",
};

// PostgREST and Postgres codes meaning "the table or function is not there".
const NOT_INSTALLED_CODES = new Set(["PGRST202", "PGRST205", "42P01", "42883"]);
// Codes whose server message is written for people and worth showing as is.
const SERVER_WORDED_CODES = new Set<AppErrorCode>(["BRVAL", "BRNTF"]);

export class AppError extends Error {
  readonly code: AppErrorCode;

  constructor(code: AppErrorCode, message?: string) {
    super(message ?? DEFAULT_MESSAGES[code]);
    this.name = "AppError";
    this.code = code;
  }

  static config(): AppError {
    return new AppError("CONFIG");
  }

  toPayload(): AppErrorPayload {
    return { code: this.code, message: this.message };
  }
}

type PostgrestLikeError = { code: string; message: string };

function isPostgrestLikeError(error: unknown): error is PostgrestLikeError {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    "message" in error &&
    typeof error.code === "string" &&
    typeof error.message === "string"
  );
}

function fromSqlState(error: PostgrestLikeError): AppError {
  const code = error.code;
  if (code === "BRVAL" || code === "BRPRM" || code === "BRNTF" || code === "BRSLT") {
    const serverMessage = error.message.trim();
    return new AppError(
      code,
      SERVER_WORDED_CODES.has(code) && serverMessage ? serverMessage : undefined,
    );
  }
  if (code === "42501") return new AppError("BRPRM");
  if (NOT_INSTALLED_CODES.has(code)) return new AppError("NOT_INSTALLED");
  return new AppError("UNKNOWN");
}

export function toAppError(error: unknown): AppError {
  if (error instanceof AppError) return error;
  if (isAuthError(error)) {
    if (error.code === "invalid_credentials") {
      return new AppError("AUTH", "Email or password is incorrect.");
    }
    if (error.code === "phone_exists") {
      return new AppError("BRVAL", "An account with this phone number already exists.");
    }
    if (error.code === "email_exists" || error.code === "user_already_exists") {
      return new AppError("BRVAL", "An account with this email already exists.");
    }
    if (error.code === "weak_password") {
      return new AppError("BRVAL", "That password is too weak. Use a longer one.");
    }
    if (error.code === "over_email_send_rate_limit") {
      return new AppError("BRVAL", "An email went to this address moments ago. Wait a minute and try again.");
    }
    if (error.code === "user_not_found") {
      return new AppError("BRNTF", "This account no longer exists.");
    }
    if (error.code === "email_not_confirmed") {
      return new AppError("AUTH", "This email address is not confirmed yet.");
    }
    if (error.status === 0 || error.name === "AuthRetryableFetchError") {
      return new AppError("NETWORK");
    }
    return new AppError("AUTH");
  }
  if (isPostgrestLikeError(error)) return fromSqlState(error);
  if (error instanceof TypeError) return new AppError("NETWORK");
  return new AppError("UNKNOWN");
}

export function errorPayload(error: unknown): AppErrorPayload {
  return toAppError(error).toPayload();
}
