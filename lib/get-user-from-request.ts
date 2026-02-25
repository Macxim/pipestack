import { NextRequest } from "next/server";
import { createSupabaseServerClient } from "./supabase-server";
import { validateApiKey } from "./validate-api-key";

export async function getUserFromRequest(req: NextRequest): Promise<string | null> {
  // Check for API key first (used by extension)
  const apiKey = req.headers.get("x-api-key");
  if (apiKey) {
    return validateApiKey(apiKey);
  }

  // Fall back to session auth (used by browser)
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id ?? null;
}