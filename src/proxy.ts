import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { readSupabasePublicEnv } from "@/lib/supabase/env";
import { PATHNAME_HEADER } from "@/lib/utils/request-headers";

const PUBLIC_PATHS = ["/login"];

/**
 * Runs before every page and API request: refreshes the Supabase session cookie and sends
 * unauthenticated visitors to /login. Permission checks happen in the layout, pages,
 * actions and route handlers, close to the data.
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const forward = () => {
    const headers = new Headers(request.headers);
    headers.set(PATHNAME_HEADER, pathname);
    return NextResponse.next({ request: { headers } });
  };

  const env = readSupabasePublicEnv();
  // Without configuration the login page still renders and explains what is missing.
  if (!env) return forward();

  let response = forward();
  const supabase = createServerClient(env.url, env.publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
        response = forward();
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
        for (const [key, value] of Object.entries(headers)) response.headers.set(key, value);
      },
    },
  });

  // getClaims validates the JWT (and refreshes it when expired) before trusting it.
  const { data } = await supabase.auth.getClaims();
  const signedIn = Boolean(data?.claims?.sub);

  if (signedIn || PUBLIC_PATHS.includes(pathname)) return response;

  if (pathname.startsWith("/api/")) {
    return NextResponse.json(
      { error: { code: "AUTH", message: "Sign in first." } },
      { status: 401 },
    );
  }

  const url = request.nextUrl.clone();
  url.pathname = "/login";
  url.search = "";
  const redirect = NextResponse.redirect(url);
  for (const cookie of response.cookies.getAll()) redirect.cookies.set(cookie);
  return redirect;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
