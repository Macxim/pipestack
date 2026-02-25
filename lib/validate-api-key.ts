import { createClient } from "@supabase/supabase-js";

// Uses service role key to bypass RLS for key validation
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function validateApiKey(key: string): Promise<string | null> {
  if (!key) return null;

  const { data } = await supabaseAdmin
    .from("api_keys")
    .select("user_id")
    .eq("key", key)
    .single();

  return data?.user_id ?? null;
}