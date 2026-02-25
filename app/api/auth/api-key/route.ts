import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { randomBytes } from "crypto";

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Return existing key if one exists
    const { data: existing } = await supabase
      .from("api_keys")
      .select("key")
      .eq("user_id", user.id)
      .single();

    if (existing) {
      return NextResponse.json({ key: existing.key });
    }

    // Generate a new key
    const key = `pk_${randomBytes(32).toString("hex")}`;

    const { error } = await supabase
      .from("api_keys")
      .insert({ user_id: user.id, key });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ key });
  } catch {
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}

// Regenerate key
export async function POST() {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const key = `pk_${randomBytes(32).toString("hex")}`;

    const { error } = await supabase
      .from("api_keys")
      .upsert({ user_id: user.id, key }, { onConflict: "user_id" });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ key });
  } catch {
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}