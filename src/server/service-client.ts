import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { AppError } from "@/lib/supabase/errors";
import { readSupabasePublicEnv } from "@/lib/supabase/env";
import type { Database } from "@/types/database";

/*
 * Service-role client: bypasses RLS, so it is used only for Auth admin calls the publishable
 * key cannot make (creating users). Server code only; the key is never logged or returned.
 */

export class ServiceRoleMissingError extends AppError {
  constructor() {
    super("SERVICE_ROLE_MISSING");
    this.name = "ServiceRoleMissingError";
  }
}

export function isServiceRoleConfigured(): boolean {
  return Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export function createServiceClient(): SupabaseClient<Database> {
  const env = readSupabasePublicEnv();
  if (!env) throw AppError.config();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) throw new ServiceRoleMissingError();
  return createClient<Database>(env.url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
