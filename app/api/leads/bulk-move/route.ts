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

    const { leadIds, stageId } = await req.json();

    if (!Array.isArray(leadIds) || leadIds.length === 0) {
      return NextResponse.json({ error: "No lead IDs provided." }, { status: 400 });
    }
    if (!stageId) {
      return NextResponse.json({ error: "stageId is required." }, { status: 400 });
    }

    // Verify the target stage belongs to this user
    const { data: stage } = await supabaseAdmin
      .from("stages")
      .select("id")
      .eq("id", stageId)
      .eq("user_id", userId)
      .single();

    if (!stage) {
      return NextResponse.json({ error: "Invalid stage." }, { status: 403 });
    }

    // Get the current max position in the target stage
    const { data: lastLead } = await supabaseAdmin
      .from("leads")
      .select("position")
      .eq("stage_id", stageId)
      .order("position", { ascending: false })
      .limit(1)
      .maybeSingle();

    const startPosition = lastLead ? (lastLead.position ?? 0) + 1 : 0;

    // Move all leads and assign sequential positions
    // Note: Promise.all works fine for a reasonable number of leads
    const updates = await Promise.all(
      leadIds.map((id: string, i: number) =>
        supabaseAdmin
          .from("leads")
          .update({ stage_id: stageId, position: startPosition + i })
          .eq("id", id)
          .eq("user_id", userId)
      )
    );

    const firstError = updates.find((r) => r.error);
    if (firstError?.error) {
      return NextResponse.json({ error: firstError.error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, moved: leadIds.length });
  } catch (error) {
    console.error("Bulk move error:", error);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
