import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

/**
 * The currently authenticated user, or null.
 *
 * Deduped per request with `cache()`: the dashboard layout, the page and any
 * server action in the same request all need the user, and without this each
 * call site pays its own round trip to Supabase.
 */
export const getUserInfo = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user ?? null;
});
