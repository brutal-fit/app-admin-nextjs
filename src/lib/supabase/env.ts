export type SupabasePublicEnv = { url: string; publishableKey: string };

/**
 * Public Supabase settings. Each variable is referenced literally so Next.js can inline it
 * into the browser bundle. Returns null instead of throwing so pages still render and say
 * what is missing.
 */
export function readSupabasePublicEnv(): SupabasePublicEnv | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !publishableKey) return null;
  return { url, publishableKey };
}
