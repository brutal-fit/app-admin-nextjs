import { createBrowserClient } from "@supabase/ssr";
import { AppError } from "@/lib/supabase/errors";
import { readSupabasePublicEnv } from "@/lib/supabase/env";
import type { Database } from "@/types/database";

/** Browser client. Reads and writes the same auth cookies the server client uses. */
export function createSupabaseBrowserClient() {
  const env = readSupabasePublicEnv();
  if (!env) throw AppError.config();
  return createBrowserClient<Database>(env.url, env.publishableKey);
}
