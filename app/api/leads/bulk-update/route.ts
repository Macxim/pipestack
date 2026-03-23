import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getUserFromRequest } from "@/lib/get-user-from-request";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const userId = await getUserFromRequest(req);
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { leadIds, updates } = await req.json();

    if (!Array.isArray(leadIds) || leadIds.length === 0) {
      return NextResponse.json({ error: "No lead IDs provided." }, { status: 400 });
    }

    // Whitelist allowed fields to prevent arbitrary updates
    const safeUpdates: Record<string, any> = {};

    // Map camelCase from client to snake_case for DB
    if (updates.followUpDate !== undefined) {
      safeUpdates.follow_up_date = updates.followUpDate || null;
    }

    if (Object.keys(safeUpdates).length === 0) {
      return NextResponse.json({ error: "No valid fields to update." }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from("leads")
      .update(safeUpdates)
      .in("id", leadIds)
      .eq("user_id", userId);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true, updated: leadIds.length });
  } catch {
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
