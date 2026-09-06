import { createClient } from "@/lib/supabase/server";

export async function getUserInfo() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user ?? null;
}
