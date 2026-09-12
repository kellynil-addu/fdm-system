import "server-only";
import { cache } from "react";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Request-scoped Supabase server client.
 *
 * Wrapped in React `cache()` so every call site within one request shares a
 * single client. Independent clients each carry their own session state and
 * will each try to refresh an expired access token; with refresh-token
 * rotation enabled the losers of that race get "refresh token already used",
 * which ends the session and signs the user out mid-navigation.
 *
 * `cache()` is scoped to a single request, not global, so this still honours
 * the "never store a client in a global variable" rule — sessions cannot leak
 * between requests, including under Fluid compute.
 */
export const createClient = cache(async () => {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have proxy refreshing
            // user sessions.
          }
        },
      },
    },
  );
});
