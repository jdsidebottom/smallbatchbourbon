import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Refreshes the Supabase session cookie and turns unauthenticated visitors away
 * from /admin early.
 *
 * This is a convenience, not the security boundary. Every admin page and action
 * independently calls `requireAdmin()`, which re-checks the session and the
 * role against the database — which matters all the more here, because Proxy is
 * meant to run detached from render code and can be deployed to a CDN edge.
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  // Without Supabase configured the admin simply isn't reachable.
  if (!url || !key) return response;

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        // The library hands us Cache-Control, Expires and Pragma here. A response
        // that sets an auth cookie must never be cached by a CDN or reverse proxy,
        // or one visitor's session token gets served to another.
        Object.entries(headers).forEach(([name, value]) => response.headers.set(name, value));
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isPublicAdminRoute =
    pathname === "/admin/login" ||
    pathname === "/admin/no-access" ||
    pathname === "/admin/setup-required";

  if (!user && pathname.startsWith("/admin") && !isPublicAdminRoute) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/admin/login";
    redirectUrl.searchParams.set("next", pathname);
    return redirectCarryingSession(redirectUrl, response);
  }

  if (user && pathname === "/admin/login") {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/admin";
    redirectUrl.search = "";
    return redirectCarryingSession(redirectUrl, response);
  }

  return response;
}

/**
 * Redirects while keeping any cookies Supabase just wrote.
 *
 * `setAll` above records refreshed tokens on `response`. A bare
 * `NextResponse.redirect()` is a different response and carries none of them, so
 * returning one would drop the refresh on the floor. Because refresh tokens
 * rotate, the browser would then be holding a token the server has already
 * spent: the next request fails to refresh and bounces back to the login page,
 * which redirects here again. Carry the cookies over instead.
 */
function redirectCarryingSession(url: URL, source: NextResponse) {
  const redirect = NextResponse.redirect(url);
  source.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
  // The no-store headers have to travel with the cookies they protect.
  for (const name of ["Cache-Control", "Expires", "Pragma"]) {
    const value = source.headers.get(name);
    if (value !== null) redirect.headers.set(name, value);
  }
  return redirect;
}

export const config = {
  matcher: ["/admin/:path*"],
};
