import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { AppError } from "@/lib/supabase/errors";
import { readSupabasePublicEnv } from "@/lib/supabase/env";
import type { Database } from "@/types/database";

export type AppSupabaseClient = SupabaseClient<Database>;

/**
 * Cookie-based server client for server components, server actions and route handlers.
 * Create one per request; the library's cache headers ride on the first cookie write.
 */
export async function createSupabaseServerClient(): Promise<AppSupabaseClient> {
  const env = readSupabasePublicEnv();
  if (!env) throw AppError.config();
  const cookieStore = await cookies();
  return createServerClient<Database>(env.url, env.publishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Server components cannot write cookies; the proxy refreshes the session instead.
        }
      },
    },
  });
}
